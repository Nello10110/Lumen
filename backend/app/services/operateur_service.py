"""Compte opérateur et console de l'installation (backlog § BK.2, lot BK.2d).

**L'opérateur** est un compte à part (`users.est_operateur`), distinct de tout propriétaire :
il n'appartient à aucun foyer (garanti par le service et, sous Postgres, par une politique de
`appartenances`), se connecte par mot de passe uniquement (jamais par SSO), et sa session prend
le périmètre `app.operateur` de la base (`database.fixer_operateur`), qui ne montre AUCUNE
ligne de patrimoine. Il voit des foyers (nom, statut, propriétaire, nombre de comptes,
dernière activité), des noms de comptes et le journal d'accès — jamais un montant.

**Amorçage.** Après migration il n'y en a pas, et l'installation se règle comme avant : par le
propriétaire de son foyer. Deux voies de création : le propriétaire, tant qu'aucun opérateur
n'existe ET que l'installation n'a qu'un foyer (`amorcer_operateur`) — c'est le compte du
foyer qui en crée UN AUTRE, distinct —, et la commande `python -m app.cli operateur creer`, qui
sert aussi à réinitialiser un mot de passe perdu (`reinitialiser_mot_de_passe`) : il n'y a pas de
serveur mail. Dès qu'un opérateur existe, les réglages d'installation quittent l'écran du
propriétaire.
"""

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import ROLE_PROPRIETAIRE, Appartenance, AuthToken, Foyer, User
from . import auth_service, foyer_service


class OperateurDejaExistantError(Exception):
    """Un opérateur existe déjà : le propriétaire ne peut plus en créer un."""


class AmorcageImpossibleError(Exception):
    """L'installation accueille plusieurs foyers : le propriétaire de l'un d'eux n'amorce plus
    l'opérateur, qui se crée en ligne de commande."""


def amorcage_possible(db: Session) -> bool:
    """Le propriétaire peut-il créer l'opérateur depuis Réglages ? Tant qu'aucun n'existe ET
    que l'installation n'a qu'un foyer."""
    return not auth_service.operateur_existe(db) and auth_service.installation_a_un_seul_foyer(db)


def creer_operateur(db: Session, username: str, password: str) -> User:
    """Crée le compte opérateur. `auth_service.NomUtilisateurPrisError` si le nom est pris —
    par un compte quelconque : un nom d'utilisateur est unique sur toute l'installation."""
    if auth_service.utilisateur_par_username(db, username) is not None:
        raise auth_service.NomUtilisateurPrisError
    try:
        return auth_service.creer_utilisateur(db, username, password, est_operateur=True)
    except IntegrityError as erreur:
        db.rollback()
        raise auth_service.NomUtilisateurPrisError from erreur


def amorcer_operateur(db: Session, username: str, password: str) -> User:
    """Voie du propriétaire : refusée (`OperateurDejaExistantError`, `AmorcageImpossibleError`)
    hors des conditions de `amorcage_possible`. À appeler pour un propriétaire déjà contrôlé
    par la route."""
    if auth_service.operateur_existe(db):
        raise OperateurDejaExistantError
    if not auth_service.installation_a_un_seul_foyer(db):
        raise AmorcageImpossibleError
    return creer_operateur(db, username, password)


def reinitialiser_mot_de_passe(db: Session, username: str, password: str) -> User:
    """Nouveau mot de passe d'un compte OPÉRATEUR (`LookupError` pour tout autre compte : la
    commande n'est pas une porte de secours vers les comptes des foyers), et fin de toutes ses
    sessions ouvertes."""
    user = auth_service.utilisateur_par_username(db, username)
    if user is None or not user.est_operateur:
        raise LookupError(username)
    user.password_hash = auth_service.hash_password(password)
    db.query(AuthToken).filter(AuthToken.user_id == user.id).delete(synchronize_session=False)
    db.commit()
    return user


# --- Console : foyers et comptes sans foyer -----------------------------------------------------


@dataclass
class VueFoyer:
    """Un foyer vu par l'opérateur : des métadonnées, jamais un montant."""

    id: int
    nom: str | None
    langue: str
    statut: str
    cree_le: datetime
    suspendu_le: datetime | None
    derniere_activite: datetime | None
    proprietaire: str | None
    nombre_comptes: int
    confirmation_attendue: str


def lister_foyers(db: Session) -> list[VueFoyer]:
    """Tous les foyers, du plus ancien au plus récent. Le nom du propriétaire et le nombre de
    comptes viennent des appartenances ; à appeler avec le périmètre de l'opérateur."""
    foyers = db.query(Foyer).order_by(Foyer.id).all()
    proprietaires = dict(
        db.query(Appartenance.foyer_id, User.username)
        .join(User, User.id == Appartenance.user_id)
        .filter(Appartenance.role == ROLE_PROPRIETAIRE)
        .all()
    )
    nombres = dict(db.query(Appartenance.foyer_id, func.count()).group_by(Appartenance.foyer_id).all())
    return [
        VueFoyer(
            id=foyer.id,
            nom=foyer.nom,
            langue=foyer.langue,
            statut=foyer.statut,
            cree_le=foyer.cree_le,
            suspendu_le=foyer.suspendu_le,
            derniere_activite=foyer.derniere_activite,
            proprietaire=proprietaires.get(foyer.id),
            nombre_comptes=nombres.get(foyer.id, 0),
            confirmation_attendue=foyer.nom or foyer_service.PHRASE_CONFIRMATION_PAR_DEFAUT,
        )
        for foyer in foyers
    ]


def vue_foyer(db: Session, foyer_id: int) -> VueFoyer:
    """Un foyer, `LookupError` s'il n'existe pas."""
    for vue in lister_foyers(db):
        if vue.id == foyer_id:
            return vue
    raise LookupError(foyer_id)


@dataclass
class CompteSansFoyer:
    id: int
    username: str
    created_at: datetime
    derniere_connexion: datetime | None


def lister_comptes_sans_foyer(db: Session) -> list[CompteSansFoyer]:
    """Les comptes qui n'appartiennent à aucun foyer, l'opérateur excepté."""
    comptes = (
        db.query(User)
        .filter(User.est_operateur.is_(False), ~User.id.in_(select(Appartenance.user_id)))
        .order_by(User.created_at, User.id)
        .all()
    )
    dernieres = auth_service.dernieres_connexions_reussies(db, [compte.id for compte in comptes])
    return [CompteSansFoyer(c.id, c.username, c.created_at, dernieres.get(c.id)) for c in comptes]
