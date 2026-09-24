"""Score patrimonial consolidé (backlog § AZ.1, veille concurrentielle du
20/09/2026) : un chiffre 0-100, moyenne pondérée de trois sous-scores dérivés de
données déjà calculées ailleurs — aucune nouvelle table, aucun nouvel appel réseau.

Trois indicateurs de qualité existaient déjà, mais dispersés et scopés au seul
portefeuille financier : `score_diversification` (`analysis_service.
compute_risk_indicators`), la qualité des données géographiques
(`analysis_service.compute_data_quality`), et implicitement le ratio d'endettement
(déductible de `patrimoine_service.compute_patrimoine_net`, jamais affiché comme
tel). Ce module les recombine en une seule note, sur TOUT le patrimoine (pas
seulement le portefeuille financier pour la diversification et l'endettement).

Principe fondateur (§ 1.2 du backlog) : un diagnostic dont la méthode reste
cachée n'a aucune valeur, et un score anxiogène sans explication encore moins.
La méthode de calcul est donc TOUJOURS restituée avec le chiffre (`sous_scores`,
chacun avec son poids et son explication) — jamais une boîte noire.

Portée : le FOYER CONSOLIDÉ uniquement, pas de variante par détenteur en V1
(cf. `routers/patrimoine.py::get_score_patrimonial`, qui restreint l'accès à
`_pas_invite` pour cette raison précise — un compte invité, dont le périmètre
est censé être limité à un ou plusieurs détenteurs, n'a pas vocation à voir le
score consolidé de tout le foyer)."""

from sqlalchemy.orm import Session

from ..i18n import tr
from . import analysis_service, patrimoine_service

POIDS_DIVERSIFICATION = 40
POIDS_QUALITE_DONNEES = 30
POIDS_ENDETTEMENT = 30

# Ratio passifs/actifs en-dessous duquel le sous-score d'endettement vaut 100.
SEUIL_ENDETTEMENT_SAIN = 0.30
# Ratio à partir duquel le sous-score d'endettement vaut 0 — interpolation
# linéaire simple entre les deux seuils, une précision au pourcent près n'ayant
# de toute façon pas de sens pour un ratio approximatif (CRD théorique vs recalé
# manuellement, cf. `loan_service`).
SEUIL_ENDETTEMENT_ELEVE = 0.80


def _score_diversification(repartition_par_classe: list[dict], actifs_totaux: float) -> int:
    """HHI (indice de Herfindahl-Hirschman, même principe que le
    `score_diversification` existant d'`analysis_service.compute_risk_indicators`)
    sur `repartition_par_classe` — mais sur TOUTES les classes d'actif du
    patrimoine (immobilier compris), pas le seul portefeuille financier.
    `actifs_totaux <= 0` ou aucune classe représentée (patrimoine entièrement
    concentré, HHI = 1) renvoient 0, jamais une division par zéro ni un score
    positif trompeur."""
    if actifs_totaux <= 0 or not repartition_par_classe:
        return 0
    hhi = sum((item["valeur"] / actifs_totaux) ** 2 for item in repartition_par_classe)
    return round((1 - hhi) * 100)


def _score_qualite_donnees(qualite: dict, patrimoine_financier: float) -> int | None:
    """`None` si le foyer n'a aucun portefeuille financier (100 % immobilier/
    épargne, par exemple) : ce sous-score n'a alors rien à mesurer, et lui donner
    une valeur par défaut (0 ou 100) fausserait le score global dans un sens ou
    l'autre. `compute_data_quality` renvoie des pourcentages 0-100 non exclusifs
    entre eux pour `pct_non_categorisee`/`pct_sans_cotation` (cf. sa docstring) :
    la formule ci-dessous peut donc descendre sous 0, d'où le clamp."""
    if patrimoine_financier <= 0:
        return None
    score = 100 - qualite["pct_non_categorisee"] - qualite["pct_sans_cotation"]
    return round(max(0.0, min(100.0, score)))


def _score_endettement(actifs_totaux: float, passifs_totaux: float) -> int:
    """`actifs_totaux <= 0` (patrimoine nul ou négatif) renvoie 0, jamais une
    division par zéro."""
    if actifs_totaux <= 0:
        return 0
    ratio = passifs_totaux / actifs_totaux
    if ratio <= SEUIL_ENDETTEMENT_SAIN:
        return 100
    if ratio >= SEUIL_ENDETTEMENT_ELEVE:
        return 0
    return round(100 * (SEUIL_ENDETTEMENT_ELEVE - ratio) / (SEUIL_ENDETTEMENT_ELEVE - SEUIL_ENDETTEMENT_SAIN))


def compute_score_patrimonial(db: Session, user_id: int) -> dict:
    """Moyenne PONDÉRÉE des sous-scores APPLICABLES : le poids d'un sous-score
    exclu (aujourd'hui, seul `qualite_donnees` peut l'être) est redistribué
    proportionnellement aux autres, jamais perdu ni comblé par une valeur
    neutre."""
    net = patrimoine_service.compute_patrimoine_net(db, user_id)
    valued_financier = analysis_service.value_holdings(analysis_service.holdings_financiers(db, user_id))
    qualite = analysis_service.compute_data_quality(db, valued_financier)

    s_diversification = _score_diversification(net["repartition_par_classe"], net["actifs_totaux"])
    s_qualite = _score_qualite_donnees(qualite, net["patrimoine_financier"])
    # Ratio comparé à des seuils flottants : calcul de score, analytique (§ BI.1).
    s_endettement = _score_endettement(float(net["actifs_totaux"]), float(net["passifs_totaux"]))

    sous_scores = [
        {
            "id": "diversification",
            "label": tr("Diversification par classe d'actif"),
            "score": s_diversification,
            "poids_pct": POIDS_DIVERSIFICATION,
            "explication": tr(
                "Basé sur l'indice de Herfindahl-Hirschman appliqué à la répartition de "
                "tout le patrimoine par classe d'actif (immobilier, actions, épargne...) — un score bas "
                "signale qu'une seule classe domine."
            ),
        },
        {
            "id": "endettement",
            "label": tr("Endettement"),
            "score": s_endettement,
            "poids_pct": POIDS_ENDETTEMENT,
            "explication": tr(
                "100 si les emprunts représentent moins de {sain} % du patrimoine brut, 0 à partir de {eleve} %, "
                "interpolé entre les deux.",
                sain=int(SEUIL_ENDETTEMENT_SAIN * 100),
                eleve=int(SEUIL_ENDETTEMENT_ELEVE * 100),
            ),
        },
    ]
    poids_total = POIDS_DIVERSIFICATION + POIDS_ENDETTEMENT
    somme_ponderee = s_diversification * POIDS_DIVERSIFICATION + s_endettement * POIDS_ENDETTEMENT
    if s_qualite is not None:
        sous_scores.insert(
            1,
            {
                "id": "qualite_donnees",
                "label": tr("Qualité des données du portefeuille financier"),
                "score": s_qualite,
                "poids_pct": POIDS_QUALITE_DONNEES,
                "explication": tr(
                    "Part du portefeuille financier dont la géographie est mesurée "
                    "(composition réelle ou estimée par indice) plutôt que non catégorisée ou sans cotation."
                ),
            },
        )
        poids_total += POIDS_QUALITE_DONNEES
        somme_ponderee += s_qualite * POIDS_QUALITE_DONNEES

    score_global = round(somme_ponderee / poids_total) if poids_total > 0 else 0
    return {"score_global": score_global, "sous_scores": sous_scores}
