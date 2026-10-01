"""Vie d'un compte et d'un foyer (backlog § BK.2, lots BK.2b et BK.2c) : quitter un
foyer, en créer un quand on n'en a aucun, transférer la propriété, retirer un membre,
supprimer un foyer, supprimer son compte.

**Un compte n'est pas un foyer.** Retirer un compte d'un foyer supprime son
APPARTENANCE à ce foyer (avec son périmètre d'invité et les sessions qui y pointaient),
jamais le compte : il peut appartenir à d'autres foyers, que celui qui le retire ne voit
pas. **Un compte n'est supprimé que par lui-même** (décision du 30/09/2026, qui amende la
décision 4 de la fiche) : quitter son dernier foyer, être retiré par le propriétaire ou
voir son foyer supprimé le laisse SANS foyer — il peut rejoindre un autre foyer, en
créer un, ou supprimer son compte. Seul l'OPÉRATEUR (lot BK.2d) peut aussi supprimer un
compte, et seulement un compte sans foyer (`supprimer_compte_sans_foyer`).

**L'opérateur** administre les foyers sans en voir le patrimoine : il suspend et réactive un
foyer, désigne un nouveau propriétaire parmi ses membres, supprime un foyer
(`supprimer_foyer`, qui restreint la session à ce seul foyer le temps de l'effacement).

**Périmètre de la base (Postgres).** Un propriétaire ne voit que son foyer courant : ce
qui doit franchir cette limite est un nombre (`nombre_appartenances`, les aperçus) ou
l'effacement d'UN foyer (`foyer_le_temps`), jamais une lecture sans restriction.
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from .. import database
from ..models import (
    ROLE_MEMBRE,
    ROLE_PROPRIETAIRE,
    STATUT_FOYER_ACTIF,
    STATUT_FOYER_SUSPENDU,
    AccessLogEntry,
    Appartenance,
    AuthToken,
    Detenteur,
    Foyer,
    Invitation,
    InvitationPerimetre,
    LiaisonSsoEnAttente,
    LienPartage,
    PerimetreInvite,
    User,
)
from . import auth_service, donnees_service, historique_cache, installation_service

logger = logging.getLogger("patrimoine.foyer_service")

# Phrase à taper pour confirmer une opération destructrice sur le foyer, tant qu'aucun nom
# ne lui a été donné — sinon, le nom du foyer lui-même.
PHRASE_CONFIRMATION_PAR_DEFAUT = "SUPPRIMER"


def _maintenant() -> datetime:
    """Horodatage naïf (UTC implicite), comme le reste de l'authentification."""
    return datetime.now(UTC).replace(tzinfo=None)


class ProprietaireNeQuittePasError(Exception):
    pass


class CreationFoyerRefuseeError(Exception):
    """Réglage d'installation à « non »."""


class CompteAvecFoyerError(Exception):
    """L'opérateur ne supprime qu'un compte SANS foyer : celui-ci appartient encore à un foyer."""


class DejaUnFoyerError(Exception):
    pass


class ProprietaireRequisError(Exception):
    """L'appartenance de celui qui agit n'est (plus) celle d'un propriétaire du foyer : un
    transfert concurrent a déjà eu lieu."""


class CibleTransfertInvalideError(Exception):
    """On ne transfère la propriété qu'à un MEMBRE du foyer : ni un invité, ni soi-même."""


class ProprietaireAvecMembresError(Exception):
    """Propriétaire d'un foyer qui compte d'autres comptes : il en transfère la propriété
    (ou supprime le foyer) avant de supprimer son compte."""


def compte_peut_creer_foyer(db: Session, user: User) -> bool:
    """Ce qu'affiche l'écran « aucun foyer » : créer le sien, si l'installation l'autorise,
    pour un compte qui n'appartient à aucun foyer (suspendu compris) et n'est pas
    opérateur."""
    return (
        not user.est_operateur
        and installation_service.creation_foyer_par_compte_sans_foyer(db)
        and auth_service.nombre_appartenances(db, user.id) == 0
    )


def retirer_du_foyer(db: Session, user_id: int, appartenance: Appartenance) -> None:
    """Supprime l'appartenance, le périmètre d'invité du compte dans CE foyer, et détache
    de ce foyer les sessions qui y pointaient (elles repassent sans foyer). Les données
    restent au foyer, et le compte aussi : c'est ce que fait le propriétaire qui retire un
    membre. À appeler sur le foyer courant de la session.

    Sous Postgres, un propriétaire n'écrit que SES sessions (§ BK.2e) : celles du membre retiré
    ne sont pas touchées par cette requête. Elles n'en perdent pas moins leur foyer à leur
    prochaine requête, que `auth_service.reprendre_session` revérifie en base."""
    detenteurs = db.query(Detenteur.id).filter(Detenteur.foyer_id == appartenance.foyer_id)
    db.query(PerimetreInvite).filter(
        PerimetreInvite.user_id == user_id, PerimetreInvite.detenteur_id.in_(detenteurs.scalar_subquery())
    ).delete(synchronize_session=False)
    db.query(AuthToken).filter(AuthToken.user_id == user_id, AuthToken.foyer_id == appartenance.foyer_id).update(
        {"foyer_id": None}, synchronize_session=False
    )
    db.delete(appartenance)
    db.commit()


def _rouvrir_dernier_foyer(db: Session, user: User, auth_token: AuthToken) -> None:
    """La session, qui vient de perdre son foyer courant, rouvre le dernier foyer utilisé
    parmi ceux qui restent au compte, ou aucun."""
    database.fixer_foyer(db, None, user.id)
    restante = auth_service.appartenance_par_defaut(db, user.id)
    if restante is None:
        auth_service.adopter_foyer(db, user, None)
    else:
        db.refresh(auth_token)
        auth_service.changer_foyer_courant(db, user, auth_token, restante)


def quitter_foyer(db: Session, user: User, auth_token: AuthToken) -> None:
    """Le compte quitte son foyer courant. Le propriétaire ne le peut pas : ses
    responsabilités passent d'abord à un autre membre. La session rouvre ensuite le
    dernier foyer utilisé parmi ceux qui restent, ou aucun."""
    appartenance = auth_service.appartenance_active(db, user.id, auth_service.id_foyer(user))
    if appartenance is None:
        raise LookupError(user.id)
    if appartenance.role == ROLE_PROPRIETAIRE:
        raise ProprietaireNeQuittePasError
    retirer_du_foyer(db, user.id, appartenance)
    _rouvrir_dernier_foyer(db, user, auth_token)


def transferer_la_propriete(db: Session, foyer_id: int, proprietaire: User, membre_id: int) -> Appartenance:
    """Le propriétaire de `foyer_id` en confie la propriété à un MEMBRE du foyer : en une
    transaction, il devient membre et l'autre propriétaire. Les données sont ancrées au
    foyer, pas au compte : aucune ligne à réécrire. Renvoie l'appartenance de l'ancien
    propriétaire, désormais membre.

    `LookupError` : le compte visé n'appartient pas à ce foyer (jamais distingué d'un
    compte inconnu). L'index unique partiel « un seul propriétaire par foyer » interdit
    d'avoir deux propriétaires, même un instant : l'ancien descend d'abord, le nouveau
    monte ensuite, chacun dans son écriture."""
    ancienne = auth_service.appartenance_active(db, proprietaire.id, foyer_id)
    if ancienne is None or ancienne.role != ROLE_PROPRIETAIRE:
        raise ProprietaireRequisError
    nouvelle = auth_service.appartenance_active(db, membre_id, foyer_id)
    if nouvelle is None:
        raise LookupError(membre_id)
    _echanger_proprietaire(db, ancienne, nouvelle)
    return ancienne


def _echanger_proprietaire(db: Session, ancienne: Appartenance | None, nouvelle: Appartenance) -> None:
    """`nouvelle`, celle d'un MEMBRE (`CibleTransfertInvalideError` sinon), devient la
    propriétaire ; `ancienne`, si le foyer en a une, redevient membre. Commite."""
    if nouvelle.role != ROLE_MEMBRE:
        raise CibleTransfertInvalideError
    if ancienne is not None:
        ancienne.role = ROLE_MEMBRE
        db.flush()
    nouvelle.role = ROLE_PROPRIETAIRE
    db.commit()


def designer_proprietaire(db: Session, foyer_id: int, membre_id: int) -> None:
    """L'opérateur désigne un nouveau propriétaire parmi les MEMBRES du foyer (le propriétaire a
    disparu, ou ne répond plus) : l'éventuel propriétaire actuel redevient membre. Il ne voit
    pour cela que des noms de comptes. Le foyer peut être suspendu. `LookupError` : ce compte
    n'appartient pas à ce foyer ; `CibleTransfertInvalideError` : un invité, ou le propriétaire
    lui-même."""
    nouvelle = db.query(Appartenance).filter(Appartenance.user_id == membre_id, Appartenance.foyer_id == foyer_id).first()
    if nouvelle is None:
        raise LookupError(membre_id)
    ancienne = db.query(Appartenance).filter(Appartenance.foyer_id == foyer_id, Appartenance.role == ROLE_PROPRIETAIRE).first()
    _echanger_proprietaire(db, ancienne, nouvelle)


def suspendre_foyer(db: Session, foyer_id: int) -> Foyer:
    """Le foyer n'est plus sélectionnable : ses sessions repassent sans foyer sur-le-champ, ses
    liens de partage et ses invitations répondent 404. Les données restent intactes.
    `LookupError` si le foyer n'existe pas. Sans effet sur un foyer déjà suspendu."""
    foyer = db.get(Foyer, foyer_id)
    if foyer is None:
        raise LookupError(foyer_id)
    if foyer.statut != STATUT_FOYER_SUSPENDU:
        foyer.statut = STATUT_FOYER_SUSPENDU
        foyer.suspendu_le = _maintenant()
    db.query(AuthToken).filter(AuthToken.foyer_id == foyer_id).update({"foyer_id": None}, synchronize_session=False)
    db.commit()
    return foyer


def reactiver_foyer(db: Session, foyer_id: int) -> Foyer:
    """Symétrique de `suspendre_foyer`. Les sessions qui avaient perdu ce foyer le retrouvent
    par le sélecteur ou à la prochaine connexion."""
    foyer = db.get(Foyer, foyer_id)
    if foyer is None:
        raise LookupError(foyer_id)
    foyer.statut = STATUT_FOYER_ACTIF
    foyer.suspendu_le = None
    db.commit()
    return foyer


def creer_foyer_du_compte(db: Session, user: User, auth_token: AuthToken, *, nom: str | None, langue: str) -> None:
    """Un compte sans foyer crée le sien, dont il devient propriétaire — l'assistant de
    bienvenue se jouera. Refusé à un opérateur, à un compte qui a déjà un foyer, ou si
    l'installation l'interdit."""
    if user.est_operateur:
        raise auth_service.CompteOperateurError
    if auth_service.nombre_appartenances(db, user.id) > 0:
        raise DejaUnFoyerError
    if not installation_service.creation_foyer_par_compte_sans_foyer(db):
        raise CreationFoyerRefuseeError
    auth_service.creer_foyer(db, user, nom=nom, langue=langue)
    appartenance = auth_service.appartenance_par_defaut(db, user.id)
    auth_service.changer_foyer_courant(db, user, auth_token, appartenance)


# --- Suppression d'un foyer ----------------------------------------------------------------------------


def confirmation_attendue(db: Session, foyer_id: int) -> str:
    """Ce que le propriétaire tape pour confirmer la remise à zéro ou la suppression de son
    foyer : le nom du foyer s'il en a un, sinon `PHRASE_CONFIRMATION_PAR_DEFAUT`."""
    foyer = db.get(Foyer, foyer_id)
    return (foyer.nom if foyer is not None else None) or PHRASE_CONFIRMATION_PAR_DEFAUT


@dataclass
class ApercuSuppressionFoyer:
    """Ce qu'une suppression du foyer effacera, annoncé avant que le propriétaire ne
    s'engage : des nombres, jamais un montant."""

    foyer_nom: str | None
    confirmation_attendue: str
    patrimoine: dict[str, int]  # lignes par table de l'export, les tables vides omises
    liens_partage: int
    invitations: int
    comptes: int  # comptes du foyer, propriétaire compris — tous conservés
    comptes_sans_foyer: int  # ceux dont c'est le seul foyer : ils n'en auront plus aucun
    comptes_gardant_un_foyer: int


def apercu_suppression_foyer(db: Session, foyer_id: int) -> ApercuSuppressionFoyer:
    """Lève `LookupError` si le foyer n'existe pas. Les comptes qui appartiennent aussi à
    un autre foyer ne se comptent qu'en levant, le temps de ce comptage, la restriction
    de la base : un propriétaire ne voit que les appartenances de SON foyer."""
    foyer = db.get(Foyer, foyer_id)
    if foyer is None:
        raise LookupError(foyer_id)
    comptes = [user_id for (user_id,) in db.query(Appartenance.user_id).filter(Appartenance.foyer_id == foyer_id)]
    with database.tous_les_foyers_le_temps(db):
        gardant_un_foyer = (
            db.query(func.count(distinct(Appartenance.user_id)))
            .filter(Appartenance.user_id.in_(comptes), Appartenance.foyer_id != foyer_id)
            .scalar()
        )
    return ApercuSuppressionFoyer(
        foyer_nom=foyer.nom,
        confirmation_attendue=confirmation_attendue(db, foyer_id),
        patrimoine=donnees_service.compter_patrimoine(db, foyer_id),
        liens_partage=db.query(LienPartage).filter(LienPartage.foyer_id == foyer_id).count(),
        invitations=db.query(Invitation).filter(Invitation.foyer_id == foyer_id).count(),
        comptes=len(comptes),
        comptes_sans_foyer=len(comptes) - gardant_un_foyer,
        comptes_gardant_un_foyer=gardant_un_foyer,
    )


def _effacer_foyer(db: Session, foyer_id: int) -> None:
    """Efface le foyer et TOUT ce qui s'y rattache, sans commiter, dans l'ordre que les
    clés étrangères imposent (fiche § 5) : invitations et leurs périmètres, puis le
    patrimoine (liens et accès de partage, périmètres d'invité, les tables de l'export
    dont les réglages du foyer), les historiques en cache, les sessions qui pointaient ce
    foyer (elles repassent sans foyer), les appartenances, enfin le foyer.

    Les COMPTES sont conservés — comptes, sessions et journal d'accès ne se suppriment que
    par leur titulaire. Sous Postgres, la session est restreinte à CE foyer le temps de
    l'opération : les politiques de ses tables l'autorisent, et rien d'un autre foyer
    n'est à portée."""
    with database.foyer_le_temps(db, foyer_id):
        foyer = db.get(Foyer, foyer_id)
        if foyer is None:
            raise LookupError(foyer_id)
        invitations = db.query(Invitation.id).filter(Invitation.foyer_id == foyer_id)
        db.query(InvitationPerimetre).filter(InvitationPerimetre.invitation_id.in_(invitations.scalar_subquery())).delete(
            synchronize_session=False
        )
        db.query(Invitation).filter(Invitation.foyer_id == foyer_id).delete(synchronize_session=False)
        donnees_service.supprimer_patrimoine_du_foyer(db, foyer_id)
        historique_cache.supprimer_historiques_du_foyer(db, foyer_id)
        # Sous SQLite, qui n'applique pas les clés étrangères. Sous Postgres, `foyer_id` est `ON DELETE
        # SET NULL` : la clé étrangère détache de ce foyer les sessions de TOUS ses comptes, ce
        # que la politique d'`auth_tokens` ne laisserait pas faire à cette session (qui n'écrit
        # que ses propres sessions), et cette requête n'en touche alors aucune.
        db.query(AuthToken).filter(AuthToken.foyer_id == foyer_id).update({"foyer_id": None}, synchronize_session=False)
        db.query(Appartenance).filter(Appartenance.foyer_id == foyer_id).delete(synchronize_session=False)
        db.delete(foyer)
        db.flush()


def supprimer_foyer(db: Session, foyer_id: int) -> None:
    """Supprime complètement le foyer, en une transaction : tout ou rien. Indépendante de
    la session de celui qui l'appelle — le propriétaire (`supprimer_foyer_courant`), et
    l'opérateur au lot BK.2d, qui n'est dans aucun foyer. Aucun contrôle de droits ici :
    c'est le rôle de la route."""
    try:
        _effacer_foyer(db, foyer_id)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("suppression du foyer annulee (foyer %s)", foyer_id)
        raise
    logger.info("foyer %s supprime", foyer_id)


def supprimer_foyer_courant(db: Session, user: User, auth_token: AuthToken) -> None:
    """Le propriétaire supprime son foyer courant. Sa session rouvre ensuite le dernier
    foyer utilisé parmi ceux qui lui restent, ou aucun."""
    supprimer_foyer(db, auth_service.id_foyer(user))
    _rouvrir_dernier_foyer(db, user, auth_token)


# --- Suppression de son compte --------------------------------------------------------------------------


@dataclass
class FoyerConcerne:
    id: int
    nom: str | None
    role: str


@dataclass
class FoyerBloquant:
    """Un foyer dont le compte est propriétaire et qui compte d'autres comptes."""

    id: int
    nom: str | None
    autres_comptes: int


@dataclass
class ApercuSuppressionCompte:
    """Ce qu'entraîne la suppression d'un compte, annoncé avant qu'il ne s'engage."""

    # Propriétaire ET seul compte : le foyer disparaît avec lui.
    foyers_supprimes: list[FoyerConcerne]
    # Membre ou invité : il n'y perd que sa place.
    foyers_quittes: list[FoyerConcerne]
    # Propriétaire d'un foyer qui a d'autres comptes : à transférer ou à supprimer d'abord.
    foyers_bloquants: list[FoyerBloquant]

    @property
    def peut_supprimer(self) -> bool:
        return not self.foyers_bloquants


def _nombres_de_comptes(db: Session, foyer_ids: list[int]) -> dict[int, int]:
    """Comptes de chaque foyer. Seuls des nombres sortent de la restriction levée."""
    if not foyer_ids:
        return {}
    with database.tous_les_foyers_le_temps(db):
        lignes = (
            db.query(Appartenance.foyer_id, func.count())
            .filter(Appartenance.foyer_id.in_(foyer_ids))
            .group_by(Appartenance.foyer_id)
            .all()
        )
    return dict(lignes)


def apercu_suppression_compte(db: Session, user: User) -> ApercuSuppressionCompte:
    """Tous les foyers du compte comptent, suspendus compris."""
    foyers = (
        db.query(Foyer, Appartenance)
        .join(Appartenance, Appartenance.foyer_id == Foyer.id)
        .filter(Appartenance.user_id == user.id)
        .order_by(Appartenance.id)
        .all()
    )
    nombres = _nombres_de_comptes(db, [foyer.id for foyer, appartenance in foyers if appartenance.role == ROLE_PROPRIETAIRE])
    apercu = ApercuSuppressionCompte(foyers_supprimes=[], foyers_quittes=[], foyers_bloquants=[])
    for foyer, appartenance in foyers:
        if appartenance.role != ROLE_PROPRIETAIRE:
            apercu.foyers_quittes.append(FoyerConcerne(foyer.id, foyer.nom, appartenance.role))
        elif nombres[foyer.id] > 1:
            apercu.foyers_bloquants.append(FoyerBloquant(foyer.id, foyer.nom, nombres[foyer.id] - 1))
        else:
            apercu.foyers_supprimes.append(FoyerConcerne(foyer.id, foyer.nom, appartenance.role))
    return apercu


def _effacer_compte(db: Session, user: User) -> None:
    """Supprime le compte, ses appartenances restantes, son périmètre d'invité, ses
    sessions et son journal d'accès (droit à l'effacement), sans commiter."""
    with database.tous_les_foyers_le_temps(db):
        # Les invitations qu'il a créées ou acceptées, dans n'importe quel foyer, survivent
        # à son compte : elles perdent seulement le renvoi vers lui.
        db.query(Invitation).filter(Invitation.cree_par == user.id).update({"cree_par": None}, synchronize_session=False)
        db.query(Invitation).filter(Invitation.utilisee_par == user.id).update({"utilisee_par": None}, synchronize_session=False)
        db.query(PerimetreInvite).filter(PerimetreInvite.user_id == user.id).delete(synchronize_session=False)
        db.query(Appartenance).filter(Appartenance.user_id == user.id).delete(synchronize_session=False)
    db.query(AuthToken).filter(AuthToken.user_id == user.id).delete(synchronize_session=False)
    db.query(LiaisonSsoEnAttente).filter(LiaisonSsoEnAttente.user_id == user.id).delete(synchronize_session=False)
    db.query(AccessLogEntry).filter(
        (AccessLogEntry.user_id == user.id) | (AccessLogEntry.username_saisi == user.username)
    ).delete(synchronize_session=False)
    db.delete(user)


def supprimer_son_compte(db: Session, user: User) -> None:
    """Le compte se supprime lui-même, avec ses sessions et son journal d'accès. Ses
    appartenances partent avec lui ; les foyers dont il est propriétaire ET seul compte
    disparaissent avec lui (`apercu_suppression_compte`). Refusé
    (`ProprietaireAvecMembresError`) tant qu'il est propriétaire d'un foyer qui compte
    d'autres comptes : il en transfère la propriété, ou supprime ce foyer, d'abord.
    Une transaction : tout ou rien."""
    apercu = apercu_suppression_compte(db, user)
    if not apercu.peut_supprimer:
        raise ProprietaireAvecMembresError
    try:
        for foyer in apercu.foyers_supprimes:
            _effacer_foyer(db, foyer.id)
        _effacer_compte(db, user)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("suppression du compte annulee (compte %s)", user.id)
        raise
    logger.info("compte %s supprime (foyers supprimes avec lui : %s)", user.id, [f.id for f in apercu.foyers_supprimes])


def supprimer_compte_sans_foyer(db: Session, user: User) -> None:
    """L'opérateur supprime un compte qui n'appartient à aucun foyer (§ BK.2d) : le compte, ses
    sessions et son journal d'accès, comme `supprimer_son_compte`. Refusé
    (`CompteAvecFoyerError`) pour un compte qui a encore un foyer, ou qui est opérateur : ce
    compte-là ne se supprime que lui-même. À appeler avec le périmètre de l'opérateur, qui voit
    toutes les appartenances."""
    if user.est_operateur or db.query(Appartenance.id).filter(Appartenance.user_id == user.id).first() is not None:
        raise CompteAvecFoyerError
    supprimer_son_compte(db, user)
