"""Détection des charges récurrentes et abonnements (backlog 2.N.3) — sous-produit
de l'import (2.N.1), pas un chantier séparé : regroupe les mouvements par libellé
(débarrassé de ses dates, `budget_categories_service.cle_regroupement`) sur une
fenêtre glissante, indépendamment de la période affichée à l'écran (un abonnement
mensuel reste un abonnement qu'on regarde 1 mois ou 1 an de budget).

Trois rythmes sont reconnus (§ BM.2) : mensuel, trimestriel, annuel. Chacun a sa
fenêtre d'observation — assez longue pour y voir au moins deux occurrences — et sa
fenêtre de récence, proportionnée : au-delà d'une fois et demie sa période sans
nouveau prélèvement, l'abonnement est considéré résilié. Une série qui saute un
prélèvement de temps en temps (assurance prélevée dix mois sur douze) reste périodique ;
celle qui revient sans rythme, ou trop vite, est « irrégulière » — un achat fréquent,
pas une charge.
"""

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from . import budget_categories_service, budget_service


@dataclass(frozen=True)
class _Rythme:
    nom: str
    jours: int  # intervalle nominal entre deux prélèvements
    moyenne_min: int  # bornes de l'intervalle moyen observé
    moyenne_max: int
    fenetre_jours: int  # combien de temps remonter pour y voir au moins deux occurrences
    par_an: int

    @property
    def recence_jours(self) -> int:
        return self.jours * 3 // 2


_RYTHMES = (
    _Rythme("mensuelle", jours=30, moyenne_min=20, moyenne_max=40, fenetre_jours=365, par_an=12),
    _Rythme("trimestrielle", jours=91, moyenne_min=75, moyenne_max=105, fenetre_jours=730, par_an=4),
    _Rythme("annuelle", jours=365, moyenne_min=335, moyenne_max=395, fenetre_jours=1095, par_an=1),
)
# Un intervalle plus long qu'une période et demie est un prélèvement sauté ; au-delà de
# trois périodes et demie, la série est rompue. Pas plus d'un intervalle sur trois peut
# être sauté : au-delà, ce n'est plus un rythme mais des achats espacés.
_INTERVALLE_SAUTE_MAX = 3.5
_PART_MAX_SAUTEE = 1 / 3
# Une série qui remonte à au moins ce nombre de jours est observée sur douze mois pleins :
# son coût annuel est la somme réelle des douze derniers mois, plutôt qu'une projection.
_SERIE_ANNUELLE_MIN_JOURS = 350
# Charge vue plusieurs mois sans rythme régulier : fenêtre et récence du rythme mensuel,
# comme avant § BM.2.
_FENETRE_IRREGULIERE_JOURS = 365
_RECENCE_IRREGULIERE_JOURS = 45
# On charge l'historique le plus long dont un rythme a besoin ; chaque rythme filtre
# ensuite sa propre fenêtre.
FENETRE_CHARGEMENT_JOURS = max(r.fenetre_jours for r in _RYTHMES)

# Seuil de hausse de prix (backlog 2.N.3) : au-delà de 5 %, entre deux occurrences
# consécutives OU entre la première et la dernière de la fenêtre, signalé comme une
# hausse plutôt qu'un simple arrondi de facturation.
SEUIL_HAUSSE_PRIX_PCT = Decimal("5")  # exact : compare deux montants (§ BI.1)


@dataclass
class RecurrenceDetectee:
    libelle: str
    categorie_id: int | None
    montant_actuel: Decimal
    montant_precedent: Decimal | None
    montant_initial: Decimal
    variation_prix_pct: Decimal | None
    hausse_prix: bool
    occurrences: int
    premiere_date: str
    derniere_date: str
    periodicite: str  # "mensuelle" | "trimestrielle" | "annuelle" | "irreguliere"
    cout_annuel_estime: Decimal | None  # None si irrégulière
    total_periode: Decimal  # somme des occurrences de la fenêtre observée


def _jours_depuis(iso: str, aujourdhui: date) -> int:
    return (aujourdhui - date.fromisoformat(iso)).days


def _dans_fenetre(tries: list, aujourdhui: date, fenetre_jours: int) -> list:
    return [m for m in tries if _jours_depuis(m.date, aujourdhui) <= fenetre_jours]


def _sur_deux_mois_au_moins(observees: list) -> bool:
    # Même mouvement répété le même mois ne suffit pas à parler de récurrence.
    return len({m.date[:7] for m in observees}) >= 2


def _intervalles(observees: list) -> list[int]:
    return [
        (date.fromisoformat(observees[i + 1].date) - date.fromisoformat(observees[i].date)).days
        for i in range(len(observees) - 1)
    ]


def _suit_le_rythme(observees: list, rythme: _Rythme, aujourdhui: date) -> bool:
    if len(observees) < 2 or not _sur_deux_mois_au_moins(observees):
        return False
    if _jours_depuis(observees[-1].date, aujourdhui) > rythme.recence_jours:
        return False  # plus vu depuis trop longtemps : probablement résilié
    intervalles = _intervalles(observees)
    if min(intervalles) < rythme.jours / 2 or max(intervalles) > rythme.jours * _INTERVALLE_SAUTE_MAX:
        return False
    normaux = [i for i in intervalles if i <= rythme.jours * 3 / 2]
    if len(normaux) < len(intervalles) * (1 - _PART_MAX_SAUTEE):
        return False
    # La moyenne des seuls intervalles normaux : un prélèvement sauté ne doit pas faire
    # passer la série pour un rythme plus lent, mais deux achats espacés de 5 mois puis
    # 2 semaines ne font pas un abonnement trimestriel (le second est trop court).
    return rythme.moyenne_min <= sum(normaux) / len(normaux) <= rythme.moyenne_max


def _rythme_observe(tries: list, aujourdhui: date) -> tuple[str, int | None, list] | None:
    """(nom du rythme, prélèvements par an, occurrences observées), ou `None` si la
    charge n'est pas récurrente ou n'est plus d'actualité. Du rythme le plus court au
    plus long : un abonnement mensuel se reconnaît d'abord, sans être pris pour un
    trimestriel sur une fenêtre plus large."""
    for rythme in _RYTHMES:
        observees = _dans_fenetre(tries, aujourdhui, rythme.fenetre_jours)
        if _suit_le_rythme(observees, rythme, aujourdhui):
            return rythme.nom, rythme.par_an, observees
    observees = _dans_fenetre(tries, aujourdhui, _FENETRE_IRREGULIERE_JOURS)
    if (
        len(observees) >= 2
        and _sur_deux_mois_au_moins(observees)
        and _jours_depuis(observees[-1].date, aujourdhui) <= _RECENCE_IRREGULIERE_JOURS
    ):
        return "irreguliere", None, observees
    return None


def _cout_annuel(rythme: str, par_an: int | None, montant_actuel: Decimal, tries: list, aujourdhui: date) -> Decimal | None:
    """Montant actuel × prélèvements par an, sauf pour une série mensuelle qui court depuis
    un an au moins : la somme réelle des douze derniers mois compte alors les mois sautés
    pour ce qu'ils sont (dix prélèvements ne valent pas douze) et les changements de prix.
    Limité au mensuel, où douze mois pleins tiennent dans la fenêtre : un trimestriel ou un
    annuel, selon le jour de la semaine ou la date du jour, y compterait un prélèvement de
    trop ou de moins."""
    if par_an is None:
        return None
    if rythme == "mensuelle" and _jours_depuis(tries[0].date, aujourdhui) >= _SERIE_ANNUELLE_MIN_JOURS:
        return round(sum(abs(m.montant) for m in tries if _jours_depuis(m.date, aujourdhui) < 365), 2)
    return round(montant_actuel * par_an, 2)


def _hausse(montant: Decimal, reference: Decimal) -> bool:
    return montant > reference * (1 + SEUIL_HAUSSE_PRIX_PCT / 100)


def detect_recurrences(
    db: Session, user_id: int, aujourdhui: date | None = None, compte_id: int | None = None
) -> list[RecurrenceDetectee]:
    aujourdhui = aujourdhui or date.today()
    depuis = (aujourdhui - timedelta(days=FENETRE_CHARGEMENT_JOURS)).isoformat()
    mouvements = budget_service.list_mouvements(
        db, user_id, date_debut=depuis, date_fin=aujourdhui.isoformat(), compte_id=compte_id
    )

    # Regroupé par libellé SEUL (pas (libellé, montant) comme l'heuristique plus
    # légère de `compute_depenses_recurrentes_mensuelles`, backlog 2.N.2) : une
    # hausse de prix ne peut être détectée que si deux montants différents peuvent
    # appartenir au même groupe.
    groupes: dict[str, list] = {}
    for m in mouvements:
        if m.montant >= 0:
            continue
        groupes.setdefault(budget_categories_service.cle_regroupement(m.libelle), []).append(m)

    resultats: list[RecurrenceDetectee] = []
    for mouvements_groupe in groupes.values():
        tries = sorted(mouvements_groupe, key=lambda m: m.date)
        rythme = _rythme_observe(tries, aujourdhui)
        if rythme is None:
            continue
        periodicite, par_an, observees = rythme

        montant_actuel = round(abs(observees[-1].montant), 2)
        montant_precedent = round(abs(observees[-2].montant), 2)
        montant_initial = round(abs(observees[0].montant), 2)

        resultats.append(
            RecurrenceDetectee(
                libelle=observees[-1].libelle,
                categorie_id=observees[-1].categorie_id,
                montant_actuel=montant_actuel,
                montant_precedent=montant_precedent,
                montant_initial=montant_initial,
                variation_prix_pct=round((montant_actuel - montant_initial) / montant_initial * 100, 1) if montant_initial else None,
                hausse_prix=_hausse(montant_actuel, montant_precedent) or _hausse(montant_actuel, montant_initial),
                occurrences=len(observees),
                premiere_date=observees[0].date,
                derniere_date=observees[-1].date,
                periodicite=periodicite,
                cout_annuel_estime=_cout_annuel(periodicite, par_an, montant_actuel, tries, aujourdhui),
                total_periode=round(sum(abs(m.montant) for m in observees), 2),
            )
        )

    resultats.sort(key=lambda r: r.montant_actuel, reverse=True)
    return resultats
