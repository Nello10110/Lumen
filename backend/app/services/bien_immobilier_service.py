"""Création d'un bien immobilier en une seule transaction (backlog § BN.1, lot 2) : la
ligne du patrimoine, sa valorisation initiale, sa fiche locative, son prêt (neuf ou
déjà saisi) et la répartition entre membres du foyer. Jusqu'ici l'interface enchaînait
quatre à cinq appels (création de la ligne, fiche, prêt, rattachement, quotités) : un
échec au milieu laissait un bien à moitié saisi, sans que rien n'indique où. Ici, tout
réussit ou rien n'est écrit.

Aucune des fonctions réutilisées ne valide la transaction (`commit=False`) : un seul
`commit` final. Les contrôles d'appartenance au foyer précèdent toute écriture, mais
le `rollback` reste la garantie de dernier recours, pour toute erreur survenant en
cours de route."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from ..models import (
    ORIGINE_MANUEL,
    TYPE_ACTIF_REAL_ESTATE,
    Compte,
    Detenteur,
    Etablissement,
    Holding,
    Loan,
)
from ..schemas import BienImmobilierCreate
from . import comptes_service, detenteurs_service, immobilier_service, loan_service


class ElementIntrouvableError(LookupError):
    """Un compte, établissement, emprunt ou détenteur cité par la requête n'existe pas
    dans le foyer courant — traduit en 404 par le routeur. Même message qu'un objet
    inconnu : on ne révèle jamais qu'il existe dans un autre foyer."""


def _champs_detail(payload: BienImmobilierCreate) -> dict[str, Decimal | bool | None]:
    """Champs de `HoldingImmobilierDetail` selon l'`usage` : ceux qui ne s'appliquent pas
    sont à `None` plutôt que refusés. `locatif` garde loyer, charges et frais annuels ;
    `residence_principale` garde les charges et les deux données du simulateur achat
    contre location ; `autre` n'en garde aucun. La distinction locatif/autre se relit
    ensuite par la présence du loyer (le schéma l'exige pour `locatif`)."""
    locatif = payload.usage == "locatif"
    residence = payload.usage == "residence_principale"
    return {
        "frais_notaire": payload.frais_notaire,
        "frais_travaux": payload.frais_travaux,
        "frais_acquisition_autres": payload.frais_acquisition_autres,
        "surface_m2": payload.surface_m2,
        "residence_principale": residence,
        "loyer_mensuel": payload.loyer_mensuel if locatif else None,
        "charges_mensuelles": payload.charges_mensuelles if locatif or residence else None,
        "frais_annuels": payload.frais_annuels if locatif else None,
        "simulation_loyer_estime": payload.simulation_loyer_estime if residence else None,
        "simulation_taxe_habitation_annuelle": payload.simulation_taxe_habitation_annuelle if residence else None,
    }


def _verifier_appartenance(db: Session, foyer_id: int, payload: BienImmobilierCreate) -> Loan | None:
    """Tout ce que la requête cite doit appartenir au foyer courant (IDOR) : compte,
    établissement du prêt, prêt existant, détenteurs. Renvoie le prêt existant à
    rattacher, s'il y en a un. Aucune écriture."""
    if payload.compte_id is not None:
        compte = db.get(Compte, payload.compte_id)
        if compte is None or compte.foyer_id != foyer_id:
            raise ElementIntrouvableError("Compte introuvable")

    if payload.pret is not None and payload.pret.etablissement_id is not None:
        etablissement = db.get(Etablissement, payload.pret.etablissement_id)
        if etablissement is None or etablissement.foyer_id != foyer_id:
            raise ElementIntrouvableError("Établissement introuvable")

    pret_existant = None
    if payload.pret_existant_id is not None:
        pret_existant = db.get(Loan, payload.pret_existant_id)
        if pret_existant is None or pret_existant.foyer_id != foyer_id:
            raise ElementIntrouvableError("Emprunt introuvable")
        if pret_existant.holding_id is not None:
            raise ValueError("Cet emprunt finance déjà un autre bien.")

    quotites = payload.quotites or []
    ids_detenteurs = {q.detenteur_id for q in quotites}
    if ids_detenteurs:
        nb_du_foyer = db.query(Detenteur).filter(Detenteur.foyer_id == foyer_id, Detenteur.id.in_(ids_detenteurs)).count()
        if nb_du_foyer != len(ids_detenteurs):
            raise ElementIntrouvableError("Membre du foyer introuvable")

    # Doublon de détenteur, somme différente de 100 % : refusés ici, avant d'écrire quoi
    # que ce soit. `set_quotites_holding` les revérifie à l'écriture (garde-fou).
    detenteurs_service.valider_quotites(db, foyer_id, [(q.detenteur_id, q.quotite_pct) for q in quotites])
    return pret_existant


def creer_bien_immobilier(db: Session, foyer_id: int, payload: BienImmobilierCreate) -> tuple[Holding, Loan | None]:
    """Crée le bien et tout ce qui s'y rattache, ou ne crée rien. Renvoie la ligne et son
    prêt (`None` sans emprunt). Lève `ElementIntrouvableError` (404) pour un objet hors
    foyer, `ValueError` (400) pour une règle métier ; toute autre exception annule
    la transaction puis remonte telle quelle.

    Le prêt n'a AUCUNE quotité propre : il hérite de celles du bien
    (`detenteurs_service.compute_pourcentage_emprunt`), de sorte que corriger la
    répartition du bien corrige aussi la part de dette de chacun."""
    pret_existant = _verifier_appartenance(db, foyer_id, payload)
    # Sans répartition envoyée (`None`), la règle par défaut du foyer : un bien neuf ne disparaît pas
    # de la vue des membres (§ BN.1, lot 3) ; `[]` reste « ne pas répartir ».
    repartition = comptes_service.repartition_de_creation(
        db,
        foyer_id,
        payload.compte_id,
        None if payload.quotites is None else [(q.detenteur_id, q.quotite_pct) for q in payload.quotites],
    )
    ticker = immobilier_service.identifiant_libre(db, foyer_id, payload.compte_id, payload.nom)
    maintenant = loan_service.maintenant_naif()
    valeur = payload.valeur_estimee if payload.valeur_estimee is not None else payload.prix_achat
    date_achat = datetime.strptime(payload.date_achat, "%Y-%m-%d") if payload.date_achat else None

    try:
        holding = Holding(
            foyer_id=foyer_id,
            ticker=ticker,
            nom=payload.nom,
            quantite=1,
            prix_revient_moyen=payload.prix_achat,
            type_actif=TYPE_ACTIF_REAL_ESTATE,
            compte_id=payload.compte_id,
            valeur_estimee=valeur,
            date_valeur_estimee=maintenant,
            zone_geo=payload.zone_geo,
            date_acquisition=date_achat,
            origine=ORIGINE_MANUEL,
        )
        db.add(holding)
        db.flush()  # l'identifiant de la ligne, pour les lignes filles

        # Même point d'historique que `create_holding` pour toute valeur estimée à la création.
        immobilier_service.enregistrer_point_historique(db, holding.id, valeur, maintenant, commit=False)
        immobilier_service.upsert_detail_immobilier(db, holding.id, commit=False, **_champs_detail(payload))

        pret = pret_existant
        if payload.pret is not None:
            pret = Loan(foyer_id=foyer_id, holding_id=holding.id, **payload.pret.model_dump())
            db.add(pret)
        elif pret_existant is not None:
            pret_existant.holding_id = holding.id

        detenteurs_service.set_quotites_holding(db, foyer_id, holding, repartition, commit=False)
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(holding)
    if pret is not None:
        db.refresh(pret)
    return holding, pret
