"""Vie d'un compte au regard de ses foyers (backlog § BK.2, lot BK.2b) : quitter un
foyer, en créer un quand on n'en a aucun, supprimer son compte, et le retrait d'un
membre par le propriétaire.

**Un compte n'est pas un foyer.** Retirer un compte d'un foyer supprime son
APPARTENANCE à ce foyer (avec son périmètre d'invité et les sessions qui y pointaient),
jamais le compte : il peut appartenir à d'autres foyers, que celui qui le retire ne voit
pas. Quitter son dernier foyer laisse le compte sans foyer (décision du 30/09/2026, qui
amende la décision 4 de la fiche) ; seul le compte lui-même peut alors se supprimer.
"""

from sqlalchemy.orm import Session

from .. import database
from ..models import (
    ROLE_PROPRIETAIRE,
    AccessLogEntry,
    Appartenance,
    AuthToken,
    Detenteur,
    Invitation,
    Parametre,
    PerimetreInvite,
    User,
)
from . import auth_service

# Réglage d'INSTALLATION (table `parametres`) : un compte sans foyer peut-il en créer un ?
# Autorisé tant que rien n'est écrit ; l'opérateur pourra le couper (lot BK.2d).
CLE_CREATION_FOYER_SANS_FOYER = "creation_foyer_par_compte_sans_foyer"
VALEUR_REFUSEE = "0"


class ProprietaireNeQuittePasError(Exception):
    pass


class CreationFoyerRefuseeError(Exception):
    """Réglage d'installation à « non »."""


class DejaUnFoyerError(Exception):
    pass


class CompteEncoreMembreError(Exception):
    """Un compte ne se supprime qu'une fois quitté son dernier foyer."""


def creation_foyer_autorisee(db: Session) -> bool:
    parametre = db.get(Parametre, CLE_CREATION_FOYER_SANS_FOYER)
    return parametre is None or parametre.valeur != VALEUR_REFUSEE


def compte_peut_creer_foyer(db: Session, user: User) -> bool:
    """Ce qu'affiche l'écran « aucun foyer » : créer le sien, si l'installation l'autorise,
    pour un compte qui n'appartient à aucun foyer (suspendu compris) et n'est pas
    opérateur."""
    return not user.est_operateur and creation_foyer_autorisee(db) and auth_service.nombre_appartenances(db, user.id) == 0


def retirer_du_foyer(db: Session, user_id: int, appartenance: Appartenance) -> None:
    """Supprime l'appartenance, le périmètre d'invité du compte dans CE foyer, et détache
    de ce foyer les sessions qui y pointaient (elles repassent sans foyer). Les données
    restent au foyer. À appeler sur le foyer courant de la session."""
    detenteurs = db.query(Detenteur.id).filter(Detenteur.user_id == appartenance.foyer_id)
    db.query(PerimetreInvite).filter(
        PerimetreInvite.user_id == user_id, PerimetreInvite.detenteur_id.in_(detenteurs.scalar_subquery())
    ).delete(synchronize_session=False)
    db.query(AuthToken).filter(AuthToken.user_id == user_id, AuthToken.foyer_id == appartenance.foyer_id).update(
        {"foyer_id": None}, synchronize_session=False
    )
    db.delete(appartenance)
    db.commit()


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
    database.fixer_foyer(db, None, user.id)
    restante = auth_service.appartenance_par_defaut(db, user.id)
    if restante is None:
        auth_service.adopter_foyer(db, user, None)
    else:
        db.refresh(auth_token)
        auth_service.changer_foyer_courant(db, user, auth_token, restante)


def creer_foyer_du_compte(db: Session, user: User, auth_token: AuthToken, *, nom: str | None, langue: str) -> None:
    """Un compte sans foyer crée le sien, dont il devient propriétaire — l'assistant de
    bienvenue se jouera. Refusé à un opérateur, à un compte qui a déjà un foyer, ou si
    l'installation l'interdit."""
    if user.est_operateur:
        raise auth_service.CompteOperateurError
    if auth_service.nombre_appartenances(db, user.id) > 0:
        raise DejaUnFoyerError
    if not creation_foyer_autorisee(db):
        raise CreationFoyerRefuseeError
    auth_service.creer_foyer(db, user, nom=nom, langue=langue)
    appartenance = auth_service.appartenance_par_defaut(db, user.id)
    auth_service.changer_foyer_courant(db, user, auth_token, appartenance)


def supprimer_compte(db: Session, user: User, *, effacer_journal: bool) -> None:
    """Supprime le compte, ses appartenances restantes, son périmètre d'invité et ses
    sessions. Le journal d'accès est détaché du compte (le propriétaire qui retire un
    membre garde la trace de ses connexions) ou effacé (`effacer_journal` : le compte
    qui se supprime lui-même exerce son droit à l'effacement)."""
    with database.tous_les_foyers_le_temps(db):
        # Les invitations qu'il a créées ou acceptées, dans n'importe quel foyer, survivent
        # à son compte : elles perdent seulement le renvoi vers lui.
        db.query(Invitation).filter(Invitation.cree_par == user.id).update({"cree_par": None}, synchronize_session=False)
        db.query(Invitation).filter(Invitation.utilisee_par == user.id).update({"utilisee_par": None}, synchronize_session=False)
        db.query(PerimetreInvite).filter(PerimetreInvite.user_id == user.id).delete(synchronize_session=False)
        db.query(Appartenance).filter(Appartenance.user_id == user.id).delete(synchronize_session=False)
    db.query(AuthToken).filter(AuthToken.user_id == user.id).delete(synchronize_session=False)
    # Le journal d'accès SURVIT à la suppression d'un compte par son propriétaire, par
    # conception (cf. docstring d'`AccessLogEntry`) : on détache la référence au lieu de
    # supprimer les lignes — `username_saisi` continue de dire QUI s'était connecté.
    # Sans ce détachement, la ligne gardait un `user_id` pointant dans le vide.
    if effacer_journal:
        db.query(AccessLogEntry).filter(
            (AccessLogEntry.user_id == user.id) | (AccessLogEntry.username_saisi == user.username)
        ).delete(synchronize_session=False)
    else:
        db.query(AccessLogEntry).filter(AccessLogEntry.user_id == user.id).update({"user_id": None}, synchronize_session=False)
    db.delete(user)
    db.commit()


def supprimer_son_compte(db: Session, user: User) -> None:
    """Un compte qui n'appartient plus à aucun foyer supprime le sien, sessions et
    journal d'accès compris."""
    if auth_service.nombre_appartenances(db, user.id) > 0:
        raise CompteEncoreMembreError
    supprimer_compte(db, user, effacer_journal=True)


def retirer_un_membre(db: Session, membre: User, appartenance: Appartenance) -> None:
    """Le propriétaire retire `membre` de son foyer. Seul de son espèce dans ce foyer, le
    compte (créé par le propriétaire, sans autre usage) est supprimé avec ses sessions ;
    s'il appartient à d'autres foyers, il n'y perd que son appartenance à celui-ci."""
    if auth_service.nombre_appartenances(db, membre.id) > 1:
        retirer_du_foyer(db, membre.id, appartenance)
    else:
        supprimer_compte(db, membre, effacer_journal=False)
