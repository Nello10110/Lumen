"""Historique combiné du patrimoine (lentille Net/Brut/Financier sur toute la page
Synthèse) : fusionne la série hebdomadaire déjà financière-seule de
`historical_performance_service.compute_portfolio_history` avec un historique daté,
épars, des actifs valorisés manuellement (`HoldingValuationHistory`,
`TYPES_ACTIF_PATRIMOINE_MANUEL`) et des emprunts (amortissement théorique par date,
`loan_service.compute_capital_restant_du_theorique`).

Distinct de `patrimoine_service.compute_patrimoine_net` (instantané, pas de paramètre de
date) : ce module reconstruit une SÉRIE, pas un seul point. Distinct de
`historical_performance_service` (financier seul, par contrat documenté dans son propre
en-tête) : ce module ne remplace pas cette série, il la complète.

**Limite assumée et documentée (données réelles clairsemées, cf. `docs/BACKLOG.md`)** :
les points de valorisation manuelle sont rares (parfois un seul par bien) — la portion
"manuelle" de la courbe combinée reste donc en escalier/plate pour l'immobilier/SCPI/
autre actif/véhicule tant que peu de points sont saisis, pas une vraie courbe continue.
C'est un choix assumé plutôt qu'une extrapolation inventée : mieux vaut une ligne plate
honnête qu'une fausse précision.

**Exception : lignes `TYPES_EPARGNE`, interpolées linéairement (backlog § U.2, retour
utilisateur 30/08/2026)** — livrets, PEE/PERCO, assurance-vie, PER, comptes courants
sont, à la différence de l'immobilier ci-dessus, INTERPOLÉS entre deux points connus
plutôt que plaqués en escalier (`_valeur_interpolee`) : le foyer a explicitement demandé
un lissage visuel entre deux actualisations, plutôt que le saut brutal donnant
l'impression d'un rattrapage instantané. Toujours pas d'extrapolation dans le futur
(valeur plaquée au dernier point connu au-delà) ni avant le premier point (`None`,
rien à représenter) — seul l'ENTRE-DEUX points change de comportement.

**Mode étagé Investi/Gains hors lentille Financier (backlog § U.4, retour utilisateur
30/08/2026)** : `valeur_investie`/`valeur_realisee_cumulee` (mêmes noms de champs que
`historical_performance_service.compute_portfolio_history`, pour que le frontend
réutilise la même formule de décomposition sans distinguo) sont désormais exposés ici
aussi. `valeur_investie` combine la part financière (grand livre de transactions
inchangé) et la part manuelle — cette dernière ne peut croître/décroître qu'aux points
où un versement est EXPLICITEMENT déclaré (`HoldingValuationHistory.versement`, § U.2) :
toute hausse/baisse non déclarée reste attribuée au gain, jamais à l'investi (même
convention que le résidu du bloc épargne du Rapport, § U.1/U.2). Les BREAKPOINTS de la
part investie (`_serie_investie_manuel`) restent TOUJOURS des faits ponctuels — un
versement est déclaré à une date précise, jamais une progression continue à inventer
entre deux points. Mais la valeur LUE entre deux breakpoints suit désormais la même
bascule que la valeur brute juste au-dessus (`_valeur_investie_ligne_a_date`, miroir de
`_valeur_ligne_a_date`) : en escalier pour l'immobilier/SCPI/etc., interpolée pour
`TYPES_EPARGNE`. Correctif du 16/09/2026 (retour utilisateur : un PER passé de 0€ à
50 000€ entre deux points affichait un mode étagé « n'importe quoi ») — avant ce
correctif, l'investi restait TOUJOURS en escalier même pour `TYPES_EPARGNE`, pendant que
la valeur brute progressait en ligne continue : `Gains = Valeur − Investi` oscillait
alors de façon incohérente entre les deux points au lieu de progresser proprement.
`valeur_realisee_cumulee` reste exclusivement financière (ventes/dividendes/intérêts) —
aucun équivalent « réalisé » pour un bien valorisé manuellement, qui ne se cède pas par
petites parts comme une action.

**Limite assumée sur le scoping par détenteur** : les quotités (`QuotiteHolding`/
`QuotiteLoan`) ne sont pas historisées, seule la répartition D'AUJOURD'HUI existe. Les
lignes valorisées manuellement et les emprunts qui leur sont rattachés sont traités de
façon EXACTE (pourcentage d'aujourd'hui appliqué à la série propre de CETTE ligne). La
poche financière, elle, n'a pas de série par ligne exposée par `compute_portfolio_history`
(agrégée sur tout le portefeuille) : elle est donc scindée par un simple RATIO
d'aujourd'hui (`patrimoine_financier(détenteur) / patrimoine_financier(foyer)`), appliqué
uniformément à toute la série — suppose que cette répartition n'a pas changé dans le
temps. Un emprunt rattaché à une ligne financière (cas non observé en pratique — un
emprunt finance typiquement un bien immobilier, pas une action) tomberait dans ce même
flou plutôt que d'être netté avec la précision du cas manuel."""

import bisect
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from ..models import TYPE_ACTIF_REAL_ESTATE, TYPES_ACTIF_PATRIMOINE_MANUEL, TYPES_EPARGNE, Compte, Holding, Loan
from . import (
    analysis_service,
    detenteurs_service,
    historical_performance_service,
    historique_cache,
    immobilier_service,
    loan_service,
    patrimoine_service,
)
from .historical_performance_service import TimeSeries


def _valeur_interpolee(serie: TimeSeries, date: datetime) -> float | None:
    """Comme `historical_performance_service._value_at`, mais INTERPOLE
    linéairement entre les deux points connus qui encadrent `date`, plutôt que de
    plaquer platement la dernière valeur connue (LOCF) jusqu'au point suivant —
    utilisée uniquement pour les lignes `TYPES_EPARGNE` (retour utilisateur
    30/08/2026, cf. docstring du module). `serie` doit être triée par date
    croissante (même contrat que `_value_at`). `None` avant le premier point ou
    série vide (rien à représenter) ; plaquée à la dernière valeur connue au-delà
    du dernier point (aucune extrapolation dans le futur — seule différence avec
    une interpolation "pure")."""
    if not serie:
        return None
    if date < serie[0][0]:
        return None
    if date >= serie[-1][0]:
        return serie[-1][1]
    idx = bisect.bisect_right(serie, date, key=lambda point: point[0])
    date_avant, valeur_avant = serie[idx - 1]
    date_apres, valeur_apres = serie[idx]
    if date_apres == date_avant:
        return valeur_apres
    fraction = (date - date_avant).total_seconds() / (date_apres - date_avant).total_seconds()
    return valeur_avant + (valeur_apres - valeur_avant) * fraction


def _valeur_ligne_a_date(holding: Holding, serie: TimeSeries, date: datetime) -> float | None:
    """Bascule entre les deux régimes ci-dessus selon le type de ligne — voir le
    docstring du module pour la justification de cette distinction."""
    if holding.type_actif in TYPES_EPARGNE:
        return _valeur_interpolee(serie, date)
    return historical_performance_service._value_at(serie, date)


def _valeur_investie_ligne_a_date(holding: Holding, serie_investie: TimeSeries, date: datetime) -> float | None:
    """Même bascule que `_valeur_ligne_a_date` ci-dessus, appliquée à la série
    INVESTIE (`_serie_investie_manuel`) plutôt qu'à la valeur brute — voir le
    docstring du module (§ U.4, correctif du 16/09/2026) pour la justification :
    sans ce miroir, une ligne `TYPES_EPARGNE` affichait un mode étagé incohérent,
    la valeur brute progressant en continu pendant que l'investi restait plaqué en
    escalier entre les deux mêmes points."""
    if holding.type_actif in TYPES_EPARGNE:
        return _valeur_interpolee(serie_investie, date)
    return historical_performance_service._value_at(serie_investie, date)


def _series_financieres(
    db: Session, user_id: int, cles_filtres: set[tuple[str, int | None]] | None = None
) -> tuple[TimeSeries, TimeSeries, TimeSeries]:
    """`(valeur, investie, realisee_cumulee)` — un seul appel à `compute_portfolio_history`
    (déjà mis en cache par ce module, coûteux en réseau) plutôt que trois, pour
    alimenter à la fois la valeur brute et le mode étagé Investi/Gains (§ U.4).

    `cles_filtres` (§ AX, filtres classe/compte/établissement de l'onglet Évolution
    d'Analyse, réutilisés ici comme pour le mode étagé Net/Brut du tableau de bord) :
    `None` = portefeuille financier entier, comportement historique inchangé."""
    points = historical_performance_service.compute_portfolio_history(db, user_id, cles_filtres=cles_filtres)
    valeur = [(datetime.fromisoformat(p["date"]), p["valeur_portefeuille"]) for p in points]
    investie = [(datetime.fromisoformat(p["date"]), p["valeur_investie"]) for p in points]
    realisee = [(datetime.fromisoformat(p["date"]), p["valeur_realisee_cumulee"]) for p in points]
    return valeur, investie, realisee


def _serie_holding_manuel(holding: Holding, points_historique: list) -> TimeSeries:
    """`points_historique` : déjà chargé par l'appelant (une requête, pas une par
    holding). Dégrade avec grâce vers une ligne plate à `valeur_estimee` depuis
    `created_at` quand aucun point daté n'existe encore (ligne créée avant
    l'auto-horodatage, ou jamais valorisée) — jamais 0 ou une exception.

    Ancrage sur le coût d'acquisition (retour utilisateur, 26/08/2026) : si
    `Holding.date_acquisition` est renseignée et ANTÉRIEURE au premier point connu
    ci-dessus (cas courant — un bien est souvent saisi dans l'appli bien après son
    achat réel, cf. § 2.S.3), un point de départ à `prix_revient_moyen` (coût
    d'acquisition) est inséré à cette date : la courbe part alors du prix payé plutôt
    que de démarrer artificiellement tard (`created_at`) ou de laisser croire que la
    valeur actuelle était déjà celle du jour de l'achat. Sans effet si
    `prix_revient_moyen` n'est pas renseigné (rien à représenter à cette date)."""
    serie: TimeSeries = [(p.date_valeur, p.valeur) for p in points_historique] if points_historique else []
    if not serie and holding.valeur_estimee is not None:
        serie = [(holding.created_at, holding.valeur_estimee)]
    ancrage_possible = holding.date_acquisition is not None and holding.prix_revient_moyen is not None
    if ancrage_possible and (not serie or holding.date_acquisition < serie[0][0]):
        serie.insert(0, (holding.date_acquisition, holding.prix_revient_moyen))
    return serie


def _serie_investie_manuel(holding: Holding, points_historique: list, frais_acquisition: float = 0.0) -> TimeSeries:
    """Série de la part INVESTIE (cumulée) d'une ligne manuelle — pour le mode étagé
    Investi/Gains hors lentille Financier (backlog § U.4). Même ancrage que
    `_serie_holding_manuel` ci-dessus (coût d'acquisition à `prix_revient_moyen` si
    connu et antérieur au premier point) : au tout premier point connu de la ligne
    (l'ancrage s'il existe, sinon le premier point réel, sinon `valeur_estimee`),
    l'investi est supposé égal à la valeur affichée à ce moment-là — faute de mieux,
    c'est la meilleure hypothèse possible sur ce qui a été mis dedans jusque-là — SAUF
    quand un ancrage sur le coût d'acquisition s'applique (même condition que
    `_serie_holding_manuel`) : c'est alors `prix_revient_moyen` (+ `frais_acquisition`
    pour un bien immobilier, retour utilisateur du 10/09/2026 — cf.
    `immobilier_service.frais_acquisition_total`) qui sert de base, pas la valeur du
    premier point réel (qui peut déjà inclure une performance depuis l'achat — sans
    quoi cette performance serait comptée à tort dans l'investi plutôt que dans le
    gain). Ensuite, l'investi cumulé ne bouge QU'aux points où
    `HoldingValuationHistory.versement` est explicitement déclaré (§ U.2) — tout écart
    non déclaré entre deux points reste un gain, jamais un ajout d'investi (même
    convention que le résidu du Rapport). L'ancrage synthétique lui-même (pas une
    ligne de la table, jamais de `versement`) ne peut jamais faire varier ce cumul,
    par construction — mais SI l'ancrage s'applique, même le PREMIER point réel est
    alors évalué pour un versement déclaré (l'argent injecté entre l'achat et cette
    première estimation a pu être précisé).

    `frais_acquisition` : notaire/travaux/autres pour un bien immobilier (`0.0` par
    défaut, donc aucun effet pour les 8 autres types manuels) — appliqué UNIQUEMENT
    à l'ancrage ci-dessous, jamais à la branche "premier point réel" plus bas (qui
    part déjà d'une valeur de marché observée, y ajouter les frais compterait en
    double)."""
    if points_historique:
        premiere_date, premiere_valeur = points_historique[0].date_valeur, points_historique[0].valeur
    elif holding.valeur_estimee is not None:
        premiere_date, premiere_valeur = holding.created_at, holding.valeur_estimee
    else:
        premiere_date, premiere_valeur = None, None

    ancrage = (
        holding.date_acquisition is not None
        and holding.prix_revient_moyen is not None
        and (premiere_date is None or holding.date_acquisition < premiere_date)
    )

    if ancrage:
        cumul = holding.prix_revient_moyen + frais_acquisition
        serie: TimeSeries = [(holding.date_acquisition, cumul)]
        points_a_evaluer = points_historique
    elif premiere_date is not None:
        cumul = premiere_valeur
        serie = [(premiere_date, cumul)]
        points_a_evaluer = points_historique[1:] if points_historique else []
    else:
        return []

    for p in points_a_evaluer:
        if p.versement is not None:
            cumul += p.versement
        serie.append((p.date_valeur, cumul))
    return serie


def _valeur_emprunt_a_date(loan: Loan, date: datetime) -> float:
    """Contrairement à `loan_service.compute_capital_restant_du_theorique` (dont le
    contrat pour `a_la_date <= date_debut` est `capital_initial` — pertinent pour
    "combien resterait dû si on demandait aujourd'hui, rétroactivement"), une dette qui
    n'existait pas encore avant `date_debut` ne doit PAS apparaître dans une série
    historique de patrimoine : 0, explicitement, avant cette date."""
    if date < loan.date_debut:
        return 0.0
    if loan.capital_restant_du_manuel is not None:
        if loan.derniere_maj_manuelle is not None and date < loan.derniere_maj_manuelle:
            return loan_service.compute_capital_restant_du_theorique(loan, date)
        # Gelé après le recalage (ou sur toute la vie du prêt si la date du recalage
        # n'est pas connue — repli sûr, cohérent avec le comportement actuel hors
        # historique, qui ignore déjà `a_la_date` dans ce cas).
        return loan_service.compute_capital_restant_du(loan)
    return loan_service.compute_capital_restant_du_theorique(loan, date)


# Champs du point tel que produit par `_compute_patrimoine_history` ci-dessous — sert
# à détecter un cache écrit par une version antérieure du schéma, cf.
# `historique_cache.forme_valide`.
_CHAMPS_POINT_PATRIMOINE = {
    "date", "valeur_financiere", "valeur_manuelle", "actifs_totaux",
    "passifs_totaux", "patrimoine_net", "patrimoine_financier",
    "valeur_investie", "valeur_investie_nette", "valeur_realisee_cumulee",
}


def compute_patrimoine_history(
    db: Session,
    user_id: int,
    detenteur_id: int | None = None,
    type_actif: str | None = None,
    compte_id: int | None = None,
    etablissement_id: int | None = None,
) -> list[dict]:
    """`type_actif`/`compte_id`/`etablissement_id` (§ AX, onglet Évolution de l'écran
    Analyse — retour utilisateur du 17/09/2026 : « un bouton brut net », combinable
    avec le sélecteur de personne déjà prévu ici ET avec les filtres classe/compte/
    établissement déjà offerts par `compute_portfolio_history_filtre`) : mêmes
    filtres, même contrat de combinaison (`compte_id`/`etablissement_id` mutuellement
    exclusifs, vérifié par l'appelant) que ce dernier — voir `_compute_patrimoine_history`
    ci-dessous pour comment les deux logiques de filtrage se combinent avec le
    netting d'emprunt et la vue par détenteur déjà en place ici."""
    cle = historique_cache.cle_historique_patrimoine(user_id, detenteur_id, type_actif, compte_id, etablissement_id)
    en_cache = historique_cache.lire(db, cle)
    if en_cache is not None and historique_cache.forme_valide(en_cache, _CHAMPS_POINT_PATRIMOINE):
        return en_cache

    points = _compute_patrimoine_history(db, user_id, detenteur_id, type_actif, compte_id, etablissement_id)
    historique_cache.ecrire(db, cle, points)
    return points


def _compute_patrimoine_history(
    db: Session,
    user_id: int,
    detenteur_id: int | None,
    type_actif: str | None = None,
    compte_id: int | None = None,
    etablissement_id: int | None = None,
) -> list[dict]:
    filtre_actif = type_actif is not None or compte_id is not None or etablissement_id is not None

    holdings_financiers_filtres = (
        _holdings_financiers_filtres(db, user_id, type_actif, compte_id, etablissement_id) if filtre_actif else []
    )
    cles_filtres = {(h.ticker, h.compte_id) for h in holdings_financiers_filtres} if filtre_actif else None
    serie_financiere, serie_financiere_investie, serie_financiere_realisee = _series_financieres(db, user_id, cles_filtres)

    holdings_manuels = _holdings_manuels_filtres(db, user_id, type_actif, compte_id, etablissement_id)
    holdings_manuels_par_id = {h.id: h for h in holdings_manuels}
    # Frais d'acquisition immobiliers (retour utilisateur du 10/09/2026) : chargés en
    # une requête groupée plutôt qu'un `detail_immobilier` par holding dans la boucle
    # ci-dessous (`details_immobiliers_par_holding`, même patron que
    # `revenus_passifs_service.py` — évite le N+1).
    ids_immobiliers = [h.id for h in holdings_manuels if h.type_actif == TYPE_ACTIF_REAL_ESTATE]
    details_immobiliers = immobilier_service.details_immobiliers_par_holding(db, ids_immobiliers)
    series_manuelles: dict[int, TimeSeries] = {}
    series_investies_manuelles: dict[int, TimeSeries] = {}
    pourcentages_manuels: dict[int, dict[int, float]] = {}
    for holding in holdings_manuels:
        historique = immobilier_service.historique_valorisation(db, holding.id)
        series_manuelles[holding.id] = _serie_holding_manuel(holding, historique)
        frais_acquisition = immobilier_service.frais_acquisition_total(details_immobiliers.get(holding.id))
        series_investies_manuelles[holding.id] = _serie_investie_manuel(holding, historique, frais_acquisition)
        if detenteur_id is not None:
            pourcentages_manuels[holding.id] = detenteurs_service.compute_pourcentages(db, holding)

    # Emprunts (§ AX) : sans filtre classe/compte/établissement, TOUS les emprunts du
    # foyer comme avant ce lot (comportement Synthèse inchangé). Avec un filtre actif,
    # restreints à ceux rattachés à une ligne qui matche ELLE-MÊME le filtre — sinon
    # filtrer sur « compte X » soustrairait un emprunt immobilier sans rapport avec ce
    # compte, ce qui n'aurait pas de sens pour la lecture Net de ce sous-ensemble.
    loans = db.query(Loan).filter(Loan.user_id == user_id).all()
    if filtre_actif:
        ids_lignes_filtrees = set(holdings_manuels_par_id) | {h.id for h in holdings_financiers_filtres}
        loans = [loan for loan in loans if loan.holding_id in ids_lignes_filtrees]
    pourcentages_emprunts: dict[int, dict[int, float]] = {}
    if detenteur_id is not None:
        for loan in loans:
            if loan.holding_id is None:
                continue  # emprunt non rattaché : jamais visible pour un détenteur individuel
            holding_rattache = holdings_manuels_par_id.get(loan.holding_id) or db.get(Holding, loan.holding_id)
            if holding_rattache is not None:
                pourcentages_emprunts[loan.id] = detenteurs_service.compute_pourcentage_emprunt(db, holding_rattache, loan)

    ratio_financier = 1.0
    if detenteur_id is not None and not filtre_actif:
        # Sans filtre : ratio foyer-wide déjà en place avant ce lot, inchangé.
        patrimoine_foyer = patrimoine_service.compute_patrimoine_net(db, user_id, None)
        patrimoine_detenteur = patrimoine_service.compute_patrimoine_net(db, user_id, detenteur_id)
        financier_foyer = patrimoine_foyer["patrimoine_financier"]
        ratio_financier = patrimoine_detenteur["patrimoine_financier"] / financier_foyer if financier_foyer > 0 else 0.0
    elif detenteur_id is not None and filtre_actif:
        # Avec un filtre : même principe de ratio « à la valeur d'aujourd'hui » (même
        # flou assumé, cf. docstring du module), mais calculé sur le SEUL sous-ensemble
        # financier filtré plutôt que sur tout le foyer — sinon un détenteur possédant
        # 100 % d'un compte filtré, mais une part différente du reste du foyer,
        # hériterait à tort du ratio global.
        valued_financiers_filtres = analysis_service.value_holdings(holdings_financiers_filtres)
        parts_financiers = detenteurs_service.compute_parts_bulk(db, [(v.holding, v.valeur) for v in valued_financiers_filtres])
        total_foyer_filtre = sum(v.valeur for v in valued_financiers_filtres)
        total_detenteur_filtre = sum(
            parts_financiers.get(v.holding.id, {}).get(detenteur_id, {}).get("part_detenue", 0.0)
            for v in valued_financiers_filtres
        )
        ratio_financier = total_detenteur_filtre / total_foyer_filtre if total_foyer_filtre > 0 else 0.0

    candidats_debut: list[datetime] = []
    if serie_financiere:
        candidats_debut.append(serie_financiere[0][0])
    for serie in series_manuelles.values():
        if serie:
            candidats_debut.append(serie[0][0])
    for loan in loans:
        candidats_debut.append(loan.date_debut)

    if not candidats_debut:
        return []

    debut = min(candidats_debut)
    maintenant = datetime.now(UTC).replace(tzinfo=None)
    grille = historical_performance_service._weekly_grid(debut, maintenant)

    points = []
    for date in grille:
        if detenteur_id is None:
            valeur_financiere = historical_performance_service._value_at(serie_financiere, date) or 0.0
            valeur_manuelle = sum(
                _valeur_ligne_a_date(holdings_manuels_par_id[holding_id], serie, date) or 0.0
                for holding_id, serie in series_manuelles.items()
            )
            passifs_totaux = sum(_valeur_emprunt_a_date(loan, date) for loan in loans)
            valeur_investie = historical_performance_service._value_at(serie_financiere_investie, date) or 0.0
            valeur_investie += sum(
                _valeur_investie_ligne_a_date(holdings_manuels_par_id[holding_id], serie, date) or 0.0
                for holding_id, serie in series_investies_manuelles.items()
            )
            valeur_realisee_cumulee = historical_performance_service._value_at(serie_financiere_realisee, date) or 0.0
        else:
            valeur_financiere = (historical_performance_service._value_at(serie_financiere, date) or 0.0) * ratio_financier
            valeur_manuelle = 0.0
            for holding_id, serie in series_manuelles.items():
                pct = pourcentages_manuels.get(holding_id, {}).get(detenteur_id)
                if pct is None:
                    continue
                valeur_manuelle += (_valeur_ligne_a_date(holdings_manuels_par_id[holding_id], serie, date) or 0.0) * pct / 100
            passifs_totaux = 0.0
            for loan in loans:
                pct = pourcentages_emprunts.get(loan.id, {}).get(detenteur_id)
                if pct is None:
                    continue
                passifs_totaux += _valeur_emprunt_a_date(loan, date) * pct / 100
            valeur_investie = (historical_performance_service._value_at(serie_financiere_investie, date) or 0.0) * ratio_financier
            for holding_id, serie in series_investies_manuelles.items():
                pct = pourcentages_manuels.get(holding_id, {}).get(detenteur_id)
                if pct is None:
                    continue
                valeur_investie += (_valeur_investie_ligne_a_date(holdings_manuels_par_id[holding_id], serie, date) or 0.0) * pct / 100
            valeur_realisee_cumulee = (historical_performance_service._value_at(serie_financiere_realisee, date) or 0.0) * ratio_financier

        actifs_totaux = valeur_financiere + valeur_manuelle
        points.append(
            {
                "date": date.date().isoformat(),
                "valeur_financiere": round(valeur_financiere, 2),
                "valeur_manuelle": round(valeur_manuelle, 2),
                "actifs_totaux": round(actifs_totaux, 2),
                "passifs_totaux": round(passifs_totaux, 2),
                "patrimoine_net": round(actifs_totaux - passifs_totaux, 2),
                "patrimoine_financier": round(valeur_financiere, 2),
                "valeur_investie": round(valeur_investie, 2),
                # Mode étagé Net (retour utilisateur 31/08/2026) : `valeur_investie`
                # ci-dessus reste BRUTE (jamais nettée d'un emprunt) alors que
                # `patrimoine_net` ci-dessus l'est déjà — les comparer directement en
                # lentille Net (`Gains = patrimoine_net - valeur_investie`) sous-comptait
                # massivement les gains d'un bien financé à crédit (la dette était
                # soustraite deux fois : une fois dans `patrimoine_net`, une fois de
                # façon détournée puisque `valeur_investie` grossier n'était jamais
                # réduit en retour). `valeur_investie_nette = valeur_investie -
                # passifs_totaux` (même netting global que `patrimoine_net`, pas de
                # rattachement par ligne ici — cohérent avec le reste de ce point,
                # calculé au niveau agrégé) restaure l'invariant attendu : Gains
                # (portefeuille + réalisé − investi) doit valoir EXACTEMENT le même
                # montant en lentille Brut et Net, la dette ne déplaçant jamais une
                # performance d'investissement, seulement le capital investi affiché.
                "valeur_investie_nette": round(valeur_investie - passifs_totaux, 2),
                "valeur_realisee_cumulee": round(valeur_realisee_cumulee, 2),
            }
        )

    return points


def _cles_financieres_filtrees(
    db: Session, user_id: int, type_actif: str | None, compte_id: int | None, etablissement_id: int | None
) -> set[tuple[str, int | None]] | None:
    """`(ticker, compte_id)` des lignes FINANCIÈRES (jamais `TYPES_ACTIF_PATRIMOINE_MANUEL`,
    qui n'ont pas de grand livre de transactions à filtrer) correspondant aux filtres
    — `None` si aucun filtre n'est demandé (comportement inchangé de
    `historical_performance_service.compute_portfolio_history`, portefeuille entier).
    Même requête que `routers/performance.py::get_portfolio_history` avant ce
    correctif, restreinte en plus aux types non-manuels (§ AM, ci-dessous)."""
    if type_actif is None and compte_id is None and etablissement_id is None:
        return None
    requete = db.query(Holding.ticker, Holding.compte_id).filter(
        Holding.user_id == user_id, Holding.type_actif.notin_(TYPES_ACTIF_PATRIMOINE_MANUEL)
    )
    if type_actif is not None:
        requete = requete.filter(Holding.type_actif == type_actif)
    if compte_id is not None:
        requete = requete.filter(Holding.compte_id == compte_id)
    if etablissement_id is not None:
        requete = requete.join(Compte, Holding.compte_id == Compte.id).filter(Compte.etablissement_id == etablissement_id)
    return {(ticker, cid) for ticker, cid in requete.all()}


def _holdings_manuels_filtres(
    db: Session, user_id: int, type_actif: str | None, compte_id: int | None, etablissement_id: int | None
) -> list[Holding]:
    requete = db.query(Holding).filter(Holding.user_id == user_id, Holding.type_actif.in_(TYPES_ACTIF_PATRIMOINE_MANUEL))
    if type_actif is not None:
        requete = requete.filter(Holding.type_actif == type_actif)
    if compte_id is not None:
        requete = requete.filter(Holding.compte_id == compte_id)
    if etablissement_id is not None:
        requete = requete.join(Compte, Holding.compte_id == Compte.id).filter(Compte.etablissement_id == etablissement_id)
    return requete.all()


def _holdings_financiers_filtres(
    db: Session, user_id: int, type_actif: str | None, compte_id: int | None, etablissement_id: int | None
) -> list[Holding]:
    """Pendant financier de `_holdings_manuels_filtres` — utilisé par
    `_compute_patrimoine_history` (§ AX) pour construire `cles_filtres` ET pour
    calculer un ratio de répartition par détenteur scopé au sous-ensemble filtré
    plutôt qu'au foyer entier. Même requête que `_cles_financieres_filtrees`
    ci-dessous, mais renvoie les `Holding` eux-mêmes (nécessaires pour
    `analysis_service.value_holdings`/`detenteurs_service.compute_parts_bulk`),
    pas seulement leurs clés `(ticker, compte_id)`."""
    requete = db.query(Holding).filter(Holding.user_id == user_id, Holding.type_actif.notin_(TYPES_ACTIF_PATRIMOINE_MANUEL))
    if type_actif is not None:
        requete = requete.filter(Holding.type_actif == type_actif)
    if compte_id is not None:
        requete = requete.filter(Holding.compte_id == compte_id)
    if etablissement_id is not None:
        requete = requete.join(Compte, Holding.compte_id == Compte.id).filter(Compte.etablissement_id == etablissement_id)
    return requete.all()


def compute_portfolio_history_filtre(
    db: Session,
    user_id: int,
    type_actif: str | None = None,
    compte_id: int | None = None,
    etablissement_id: int | None = None,
) -> list[dict]:
    """Historique de valeur COMBINÉ (financier + manuel), filtrable par classe
    d'actif/compte/établissement — graphique « Évolution » de l'écran Analyse
    (`routers/performance.py::get_portfolio_history`). Même forme de point que
    `historical_performance_service.compute_portfolio_history`
    (`PortfolioHistoryPoint` : `valeur_portefeuille`/`valeur_investie`/
    `valeur_realisee_cumulee`), consommée par le même endpoint et le même composant
    frontend.

    Correctif du 16/09/2026 (retour utilisateur : « je ne peux pas sélectionner le
    PER » dans ce graphique, « il faut pouvoir sélectionner tous les types de
    compte ») — avant ce correctif, `get_portfolio_history` filtrait uniquement le
    grand livre de transactions (`historical_performance_service`), qui ne
    connaît QUE les lignes financières reconstruites (`origine == 'reconstruit'`) :
    un PER/une assurance-vie/un livret valorisés à la main (`TYPES_ACTIF_PATRIMOINE_MANUEL`)
    étaient donc TOUJOURS absents de ce graphique, quel que soit le filtre choisi —
    `EvolutionFinanciereCard.tsx` limitait en conséquence son sélecteur aux 5
    classes financières, faute de pouvoir afficher autre chose. Cette fonction
    réutilise exactement la même logique de série par ligne que
    `_compute_patrimoine_history` ci-dessus (mode étagé du tableau de bord) —
    `_serie_holding_manuel`/`_valeur_ligne_a_date` et
    `_serie_investie_manuel`/`_valeur_investie_ligne_a_date`, TYPES_EPARGNE compris
    (§ U.2/U.4) — restreinte aux holdings manuels qui matchent le filtre, puis
    sommée point par point avec la part financière elle-même filtrée
    (`historical_performance_service.compute_portfolio_history(cles_filtres=...)`).
    Échantillonnées sur UNE grille hebdomadaire commune démarrant au plus ancien
    point connu des deux poches (même stratégie que `_compute_patrimoine_history` :
    fusionner deux grilles indépendantes, potentiellement désalignées en jour de la
    semaine puisqu'ancrées chacune à leur propre date de départ, produirait des
    trous). `valeur_realisee_cumulee` reste exclusivement financière (aucun
    équivalent « réalisé » pour une ligne manuelle, même convention que
    `_compute_patrimoine_history`).

    Sans aucun filtre, la portée s'élargit par rapport à l'ancien comportement :
    la part manuelle, jusqu'ici invisible sur cet écran, est désormais incluse —
    changement voulu, cohérent avec le fait qu'un type manuel devienne sélectionnable
    (choisir « Tout » puis « PER » ne doit jamais faire APPARAÎTRE un montant qui
    aurait été absent du total non filtré). Le tableau de bord
    (`PortfolioHistoryChart`, portefeuille entier) n'appelle volontairement jamais
    cette fonction et reste sur `historical_performance_service.compute_portfolio_history`
    seule — financier seul par contrat documenté dans son propre en-tête, cf.
    `patrimoine_service.compute_patrimoine_net`/`compute_patrimoine_history` pour la
    vue combinée déjà dédiée à cet usage-là."""
    cles_filtres = _cles_financieres_filtrees(db, user_id, type_actif, compte_id, etablissement_id)
    points_financiers = historical_performance_service.compute_portfolio_history(db, user_id, cles_filtres=cles_filtres)
    serie_financiere = [(datetime.fromisoformat(p["date"]), p["valeur_portefeuille"]) for p in points_financiers]
    serie_financiere_investie = [(datetime.fromisoformat(p["date"]), p["valeur_investie"]) for p in points_financiers]
    serie_financiere_realisee = [(datetime.fromisoformat(p["date"]), p["valeur_realisee_cumulee"]) for p in points_financiers]

    holdings_manuels = _holdings_manuels_filtres(db, user_id, type_actif, compte_id, etablissement_id)
    holdings_manuels_par_id = {h.id: h for h in holdings_manuels}
    ids_immobiliers = [h.id for h in holdings_manuels if h.type_actif == TYPE_ACTIF_REAL_ESTATE]
    details_immobiliers = immobilier_service.details_immobiliers_par_holding(db, ids_immobiliers)
    series_manuelles: dict[int, TimeSeries] = {}
    series_investies_manuelles: dict[int, TimeSeries] = {}
    for holding in holdings_manuels:
        historique = immobilier_service.historique_valorisation(db, holding.id)
        series_manuelles[holding.id] = _serie_holding_manuel(holding, historique)
        frais_acquisition = immobilier_service.frais_acquisition_total(details_immobiliers.get(holding.id))
        series_investies_manuelles[holding.id] = _serie_investie_manuel(holding, historique, frais_acquisition)

    candidats_debut: list[datetime] = []
    if serie_financiere:
        candidats_debut.append(serie_financiere[0][0])
    for serie in series_manuelles.values():
        if serie:
            candidats_debut.append(serie[0][0])

    if not candidats_debut:
        return []

    debut = min(candidats_debut)
    maintenant = datetime.now(UTC).replace(tzinfo=None)
    grille = historical_performance_service._weekly_grid(debut, maintenant)

    points = []
    for date in grille:
        valeur = historical_performance_service._value_at(serie_financiere, date) or 0.0
        valeur += sum(
            _valeur_ligne_a_date(holdings_manuels_par_id[holding_id], serie, date) or 0.0
            for holding_id, serie in series_manuelles.items()
        )
        valeur_investie = historical_performance_service._value_at(serie_financiere_investie, date) or 0.0
        valeur_investie += sum(
            _valeur_investie_ligne_a_date(holdings_manuels_par_id[holding_id], serie, date) or 0.0
            for holding_id, serie in series_investies_manuelles.items()
        )
        valeur_realisee = historical_performance_service._value_at(serie_financiere_realisee, date) or 0.0
        points.append(
            {
                "date": date.date().isoformat(),
                "valeur_portefeuille": round(valeur, 2),
                "valeur_investie": round(valeur_investie, 2),
                "valeur_realisee_cumulee": round(valeur_realisee, 2),
            }
        )
    return points


LENTILLES_VALIDES = ("financier", "brut", "net")


def points_pour_lentille(db: Session, user_id: int, lentille: str) -> list[dict]:
    """`points` au format attendu par `metriques_performance_service`/
    `historical_performance_service.compute_benchmark_history` (`valeur_portefeuille`/
    `valeur_investie`/`valeur_realisee_cumulee`), selon la lentille Net/Brut/Financier
    choisie par l'utilisateur — retour utilisateur du 09/09/2026 : la carte Métriques
    de performance avancées (TWR, comparaison à un indice...) restait toujours
    financière, quelle que soit la lentille affichée partout ailleurs sur l'écran
    (« la vue Financier ne change pas ce graphique »).

    En lentille "brut"/"net", reprend EXACTEMENT la même distinction de champs que
    `PortfolioHistoryChart` côté frontend (mode étagé Net/Brut de la Synthèse) :
    `actifs_totaux`/`valeur_investie` en Brut, `patrimoine_net`/`valeur_investie_nette`
    en Net — jamais `valeur_investie` brute face à un `patrimoine_net` déjà netté de
    l'emprunt, qui sous-compterait massivement les gains d'un bien financé à crédit."""
    if lentille == "financier":
        return historical_performance_service.compute_portfolio_history(db, user_id)

    points = compute_patrimoine_history(db, user_id)
    return [
        {
            "date": p["date"],
            "valeur_portefeuille": p["actifs_totaux"] if lentille == "brut" else p["patrimoine_net"],
            "valeur_investie": p["valeur_investie"] if lentille == "brut" else p["valeur_investie_nette"],
            "valeur_realisee_cumulee": p["valeur_realisee_cumulee"],
        }
        for p in points
    ]
