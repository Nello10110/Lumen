"""Fiche immobilier complète (backlog § 2.M.3) : détail locatif d'un bien
(`HoldingImmobilierDetail`), calcul de cashflow/rentabilité, et historique daté des
valorisations manuelles (`HoldingValuationHistory`) — jamais écrasé, contrairement à
`Holding.valeur_estimee`/`date_valeur_estimee` qui ne portent que la valeur COURANTE.

Cashflow mensuel = loyer − charges − frais/12 − mensualité de l'emprunt rattaché
(`Loan.holding_id`, backlog § 2.M.2). Rentabilité brute = loyer annuel / prix
d'acquisition total ; nette = (loyer annuel − charges annuelles − frais annuels) /
prix d'acquisition total. `prix d'acquisition total` = `Holding.prix_revient_moyen`
(montant investi à l'origine, déjà ce sens ailleurs dans l'application — cf.
`models.Holding`) + `frais_acquisition_total()` (notaire + travaux + autres,
retour utilisateur du 09/09/2026, détaillé en 3 postes le 10/09/2026 : jusqu'ici
l'utilisateur devait plier ces frais dans `prix_revient_moyen` lui-même pour
qu'ils comptent dans la rentabilité). Depuis le 10/09/2026, ce même total est
aussi injecté dans le coût de revient utilisé par la plus-value globale du
portefeuille (`patrimoine_history_service`, `performance_service`) — d'où le
helper partagé `frais_acquisition_total` plutôt qu'un calcul dupliqué à chaque
appelant."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from ..decimales import ZERO
from ..models import Holding, HoldingImmobilierDetail, HoldingValuationHistory, Loan


def detail_immobilier(db: Session, holding_id: int) -> HoldingImmobilierDetail | None:
    return db.query(HoldingImmobilierDetail).filter(HoldingImmobilierDetail.holding_id == holding_id).first()


def details_immobiliers_par_holding(db: Session, holding_ids: list[int]) -> dict[int, HoldingImmobilierDetail]:
    """Chargement groupé (une requête `IN (...)`), même patron que
    `revenus_passifs_service.py` — à utiliser par tout appelant qui boucle sur
    plusieurs holdings pour éviter un N+1 (`detail_immobilier` ci-dessus reste
    la variante mono-holding, utilisée là où une seule fiche est concernée)."""
    if not holding_ids:
        return {}
    return {
        d.holding_id: d
        for d in db.query(HoldingImmobilierDetail).filter(HoldingImmobilierDetail.holding_id.in_(holding_ids)).all()
    }


def frais_acquisition_total(detail: HoldingImmobilierDetail | None) -> Decimal:
    """Somme des 3 postes ponctuels d'acquisition (notaire, travaux, autres) —
    `0.0` si `detail` est `None` (pas de fiche immobilier saisie), jamais `None`
    lui-même : les appelants l'additionnent directement à `prix_revient_moyen`
    sans garde supplémentaire."""
    if detail is None:
        return ZERO
    return (detail.frais_notaire or ZERO) + (detail.frais_travaux or ZERO) + (detail.frais_acquisition_autres or ZERO)


def upsert_detail_immobilier(db: Session, holding_id: int, **champs) -> HoldingImmobilierDetail:
    detail = detail_immobilier(db, holding_id)
    if detail is None:
        detail = HoldingImmobilierDetail(holding_id=holding_id)
        db.add(detail)
    for cle, valeur in champs.items():
        setattr(detail, cle, valeur)
    db.commit()
    db.refresh(detail)
    return detail


def enregistrer_point_historique(
    db: Session, holding_id: int, valeur: float, date_valeur: datetime, versement: float | None = None
) -> None:
    """Ajoute un point à l'historique — n'écrase jamais un point existant, même à la
    même date (deux estimations le même jour restent deux lignes distinctes, la plus
    récente en base fait foi pour l'affichage de la valeur "courante" ailleurs).

    `versement` (backlog § U.2, retour utilisateur 30/08/2026) : part de la hausse
    (ou baisse) depuis le point précédent que le foyer déclare venir d'un versement
    plutôt que d'une performance du contrat — `None` par défaut (jamais renseigné
    par `create_holding`/`update_holding`, qui stampent une valeur "courante" sans
    notion de versement ; seule la route dédiée `PUT .../valorisation` le propose)."""
    db.add(HoldingValuationHistory(holding_id=holding_id, valeur=valeur, date_valeur=date_valeur, versement=versement))
    db.commit()


def modifier_point_historique(
    db: Session, point_id: int, valeur: float, date_valeur: datetime, versement: float | None = None
) -> HoldingValuationHistory | None:
    """Corrige un point déjà saisi (backlog quickwin § T.3, retour utilisateur
    30/08/2026) — jusqu'ici, `enregistrer_point_historique` n'ajoutait qu'en
    aveugle, sans aucun moyen de revenir sur une valeur tapée par erreur.
    `None` si `point_id` n'existe pas ; l'appartenance au bon foyer (via
    `holding_id`) est vérifiée par l'appelant (`routers/portfolio.py`), pas ici —
    cette fonction ne connaît que la table, pas l'utilisateur courant."""
    point = db.get(HoldingValuationHistory, point_id)
    if point is None:
        return None
    point.valeur = valeur
    point.date_valeur = date_valeur
    point.versement = versement
    db.commit()
    db.refresh(point)
    return point


def supprimer_point_historique(db: Session, point_id: int) -> bool:
    """Supprime un point saisi par erreur (backlog quickwin § T.3). `False` si
    `point_id` n'existe pas déjà — même contrat de vérification d'appartenance
    que `modifier_point_historique` ci-dessus."""
    point = db.get(HoldingValuationHistory, point_id)
    if point is None:
        return False
    db.delete(point)
    db.commit()
    return True


def historique_valorisation(db: Session, holding_id: int) -> list[HoldingValuationHistory]:
    return (
        db.query(HoldingValuationHistory)
        .filter(HoldingValuationHistory.holding_id == holding_id)
        .order_by(HoldingValuationHistory.date_valeur)
        .all()
    )


def historiques_valorisation_par_holding(db: Session, holding_ids: list[int]) -> dict[int, list[HoldingValuationHistory]]:
    """Chargement groupé (une requête `IN (...)`), même patron que
    `details_immobiliers_par_holding` ci-dessus — à utiliser par tout appelant qui
    boucle sur plusieurs holdings pour éviter un N+1 (`historique_valorisation`
    reste la variante mono-holding). Trié par date, même contrat que celle-ci."""
    if not holding_ids:
        return {}
    points = (
        db.query(HoldingValuationHistory)
        .filter(HoldingValuationHistory.holding_id.in_(holding_ids))
        .order_by(HoldingValuationHistory.holding_id, HoldingValuationHistory.date_valeur)
        .all()
    )
    par_holding: dict[int, list[HoldingValuationHistory]] = {}
    for p in points:
        par_holding.setdefault(p.holding_id, []).append(p)
    return par_holding


def investi_cumule_derive(holding: Holding, points_historique: list[HoldingValuationHistory]) -> Decimal | None:
    """Dernier montant cumulé "investi" connu pour une ligne valorisée manuellement,
    dérivé de son historique de valorisation daté — repli utilisé par
    `performance_service._rendement_pour_ligne` pour `cout_acquisition_total`
    quand `Holding.prix_revient_moyen` n'est pas renseigné (retour utilisateur du
    16/09/2026 : un PER valorisé uniquement via des points datés — sans jamais
    remplir le champ "prix de revient" séparé, distinct de ce mécanisme, proposé à
    la création — restait invisible du calcul de plus-value, donc absent du
    graphique "Plus-value par compte" côté frontend, `gainsParCompte.ts`, qui
    exclut toute ligne à `cout_acquisition_total` `None`).

    Même principe que le tout premier point de
    `patrimoine_history_service._serie_investie_manuel` (celui-ci ne reproduit que
    le DERNIER montant cumulé, pas la série complète — c'est tout ce dont
    `_rendement_pour_ligne` a besoin) : l'investi part de la valeur du premier
    point connu (ou `valeur_estimee` à défaut), puis ne progresse QU'aux points à
    `versement` explicitement déclaré (§ U.2) — jamais recalculé depuis
    `prix_revient_moyen`/l'ancrage sur le coût d'acquisition ici, puisque cette
    fonction n'est appelée QUE quand ce champ est vide, donc sans effet. `None` si
    aucune donnée n'existe pour cette ligne (jamais valorisée)."""
    if points_historique:
        cumul = points_historique[0].valeur
        for p in points_historique[1:]:
            if p.versement is not None:
                cumul += p.versement
        return cumul
    return holding.valeur_estimee


def flux_investis_derives(
    holding: Holding, points_historique: list[HoldingValuationHistory], frais_acquisition: Decimal = ZERO
) -> list[tuple[datetime, Decimal]]:
    """Flux de trésorerie datés (montants ALGÉBRIQUES — négatifs pour un versement
    sorti de la poche de l'investisseur) dérivés de l'historique de valorisation
    d'une ligne manuelle, pour un XIRR réel (retour utilisateur du 17/09/2026 :
    « mes PER n'ont pas de rendement annualisé affiché »). Utilisé par
    `performance_service._rendement_pour_ligne` en repli quand aucun grand livre de
    transactions n'existe pour cette ligne — bien plus fidèle que l'ancien repli à
    UN SEUL flux (`Holding.date_acquisition` → CAGR), qui suppose tout le capital
    investi le même jour : une ligne alimentée progressivement (PER versé chaque
    mois, par exemple) obtient ici un flux par versement RÉELLEMENT déclaré, à sa
    vraie date.

    Même ancrage que `patrimoine_history_service._serie_investie_manuel` (dupliqué
    ici plutôt qu'importé, pour éviter un cycle d'imports entre
    `performance_service`/`patrimoine_history_service` — `immobilier_service` est déjà
    le point de partage neutre entre les deux, cf. `investi_cumule_derive` ci-dessus
    pour le même choix) : si `date_acquisition` est connue et antérieure au premier
    point réel, le premier flux part de `prix_revient_moyen` (+ `frais_acquisition`)
    à cette date plutôt que de la valeur du premier point réel (qui peut déjà
    inclure une performance depuis l'achat). `[]` si aucune donnée n'existe (rien à
    mesurer) — `performance_service` traite alors ce cas comme n'importe quelle
    absence de flux."""
    if points_historique:
        premiere_date, premiere_valeur = points_historique[0].date_valeur, points_historique[0].valeur
    elif holding.valeur_estimee is not None:
        premiere_date, premiere_valeur = holding.created_at, holding.valeur_estimee
    else:
        return []

    ancrage = (
        holding.date_acquisition is not None
        and holding.prix_revient_moyen is not None
        and holding.date_acquisition < premiere_date
    )

    if ancrage:
        flux: list[tuple[datetime, Decimal]] = [(holding.date_acquisition, -(holding.prix_revient_moyen + frais_acquisition))]
        points_a_evaluer = points_historique
    else:
        flux = [(premiere_date, -premiere_valeur)]
        points_a_evaluer = points_historique[1:] if points_historique else []

    for p in points_a_evaluer:
        if p.versement is not None and abs(p.versement) > 1e-9:
            flux.append((p.date_valeur, -p.versement))
    return flux


def _arrondi(valeur: Decimal | None) -> Decimal | None:
    return round(valeur, 2) if valeur is not None else None


def calculer_cashflow_et_rentabilite(
    db: Session, holding: Holding, detail: HoldingImmobilierDetail | None, valeur: Decimal
) -> dict:
    """Renvoie un dict prêt à fusionner dans `HoldingImmobilierOut` — toutes les clés
    valent `None` si `detail` est absent ou si `loyer_mensuel` n'est pas renseigné
    (rien à calculer sans loyer, même si charges/frais existent seuls). `valeur` est
    la valeur déjà résolue par `holding_detail_service.build_holding_detail` (même
    règle partout : `valeur_estimee`, à défaut prix × quantité) — pas re-dérivée ici,
    pour ne jamais diverger du chiffre déjà affiché sur la fiche."""
    vide = {
        "cashflow_mensuel": None,
        "rentabilite_brute_pct": None,
        "rentabilite_nette_pct": None,
        "prix_m2": None,
        "emprunt_mensualite": None,
        "prix_acquisition_total": None,
    }
    if detail is None:
        return vide

    prix_m2 = valeur / detail.surface_m2 if detail.surface_m2 else None
    vide["prix_m2"] = _arrondi(prix_m2)

    # Indépendant du loyer (contrairement au cashflow/rentabilités ci-dessous) :
    # informatif dès que `prix_revient_moyen` est connu, même sans location.
    prix_acquisition_total = holding.prix_revient_moyen + frais_acquisition_total(detail) if holding.prix_revient_moyen else None
    vide["prix_acquisition_total"] = _arrondi(prix_acquisition_total)

    if detail.loyer_mensuel is None:
        return vide

    # Somme de TOUS les emprunts rattachés à ce bien, pas seulement le premier
    # trouvé (bug trouvé en audit, 20/09/2026) : un bien financé par deux prêts
    # (ex. crédit principal + prêt travaux) ne voyait retrancher que l'un des deux
    # de son cashflow/sa rentabilité nette affichés sur cette fiche — incohérent
    # avec `detenteurs_service.compute_parts`/`patrimoine_service._crd_par_ligne`,
    # qui somment déjà explicitement tous les emprunts rattachés à une même ligne.
    emprunts = db.query(Loan).filter(Loan.holding_id == holding.id).all()
    mensualite = sum((e.mensualite for e in emprunts), ZERO)
    charges = detail.charges_mensuelles or ZERO
    frais_mensuels = (detail.frais_annuels or ZERO) / 12
    cashflow_mensuel = detail.loyer_mensuel - charges - frais_mensuels - mensualite

    rentabilite_brute_pct = None
    rentabilite_nette_pct = None
    if prix_acquisition_total:
        loyer_annuel = detail.loyer_mensuel * 12
        rentabilite_brute_pct = loyer_annuel / prix_acquisition_total * 100
        charges_annuelles = charges * 12 + (detail.frais_annuels or ZERO)
        rentabilite_nette_pct = (loyer_annuel - charges_annuelles) / prix_acquisition_total * 100

    return {
        "cashflow_mensuel": _arrondi(cashflow_mensuel),
        "rentabilite_brute_pct": _arrondi(rentabilite_brute_pct),
        "rentabilite_nette_pct": _arrondi(rentabilite_nette_pct),
        "prix_m2": vide["prix_m2"],
        "emprunt_mensualite": _arrondi(mensualite) if emprunts else None,
        "prix_acquisition_total": vide["prix_acquisition_total"],
    }
