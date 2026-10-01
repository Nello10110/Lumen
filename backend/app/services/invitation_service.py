"""Invitations à rejoindre un foyer, ou à en créer un (backlog § BK.2, lots BK.2b et BK.2d).

Le propriétaire d'un foyer crée une invitation (rôle `membre` ou `invite`, jamais
`proprietaire`) et transmet lui-même le lien : aucun serveur mail.

**Invitation à CRÉER un foyer** (lot BK.2d) : `foyer_id` vide, rôle `proprietaire` — le foyer
naît à l'acceptation, avec la langue de l'appareil de celui qui accepte, et l'accepteur en est le
propriétaire. Elle est créée par l'opérateur (toujours) ou par le propriétaire d'un foyer, si le
mode de naissance de l'installation est `invitation` ; en mode `ferme`, une invitation de ce
genre créée par un propriétaire ne se consulte ni ne s'accepte plus. Elle n'appartient à aucun
foyer : elle est à son créateur. Un compte opérateur ne l'accepte jamais. Le jeton
(`secrets.token_urlsafe(32)`, 256 bits) n'est renvoyé qu'une fois, à la création ; la base
n'en garde que le SHA-256. Un hachage lent serait inutile face à 256 bits d'entropie, et
la recherche par jeton doit être déterministe.

**Usage unique, atomique.** L'acceptation « réclame » l'invitation par un unique `UPDATE …
WHERE utilisee_le IS NULL AND revoquee_le IS NULL AND expire_le > :maintenant` qui doit
toucher exactement UNE ligne : de deux acceptations simultanées, la base n'en laisse
réussir qu'une (SQLite sérialise les écritures ; Postgres fait attendre la seconde, qui
réévalue alors la condition). La réclamation, l'appartenance et le périmètre d'invité
sont écrits dans UNE transaction : une erreur en cours de route laisse l'invitation
intacte.

**Réponse uniforme.** Un jeton absent, expiré, révoqué, déjà utilisé, ou d'un foyer
suspendu se ressemblent tous (`InvitationIntrouvableError`, 404) : rien ne dit à qui
devine un jeton s'il a existé. Les échecs sont en outre comptés par adresse
(`verifier_debit`), comme le verrouillage de `login` mais sans écriture en base : la
route est publique et un jeton inconnu n'a pas de compte auquel rattacher un échec.

**Périmètre de la base (Postgres).** Une invitation appartient à son foyer (politique
de la migration `d1a7c5e3b9f4`). La consultation et l'acceptation précèdent
l'appartenance : elles lèvent la restriction le temps de leur opération
(`database.tous_les_foyers_le_temps`), et rien d'autre.
"""

import hashlib
import secrets
import threading
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import database
from ..models import (
    ROLE_INVITE,
    ROLE_PROPRIETAIRE,
    ROLES_ASSIGNABLES,
    STATUT_FOYER_ACTIF,
    Appartenance,
    Detenteur,
    Foyer,
    Invitation,
    InvitationPerimetre,
    PerimetreInvite,
    User,
)
from . import auth_service, installation_service

DUREES_JOURS = (1, 7, 30)
DUREE_PAR_DEFAUT_JOURS = 7
LONGUEUR_MAX_LIBELLE = 80

STATUT_EN_ATTENTE = "en_attente"
STATUT_ACCEPTEE = "acceptee"
STATUT_REVOQUEE = "revoquee"
STATUT_EXPIREE = "expiree"

# Limitation de débit des jetons inconnus, par adresse : mémoire du process, sans base.
SEUIL_ECHECS = 10
FENETRE_ECHECS_MINUTES = 15
_echecs: dict[str, list[datetime]] = {}
_verrou_echecs = threading.Lock()


class InvitationIntrouvableError(LookupError):
    """Absente, expirée, révoquée, déjà utilisée, ou d'un foyer suspendu : indiscernables."""


class InvitationNonRevocableError(Exception):
    """Déjà acceptée ou déjà révoquée."""


class DetenteurInconnuError(LookupError):
    """Un détenteur du périmètre n'est pas du foyer de l'invitation."""


class DejaMembreError(Exception):
    """Le compte appartient déjà au foyer."""


class CreationFoyerParInvitationRefuseeError(Exception):
    """Le mode de naissance de l'installation est `ferme` : seul l'opérateur crée un foyer."""


class TropDeTentativesError(Exception):
    def __init__(self, jusqua: datetime):
        super().__init__()
        self.jusqua = jusqua


@dataclass
class ApercuInvitation:
    """Ce que voit, avant de s'engager, celui qui ouvre le lien."""

    foyer_nom: str | None
    role: str
    libelle: str | None
    # Langue du foyer qui invite : la page publique s'y aligne, comme celle d'un lien de partage.
    # `None` pour une invitation à créer un foyer, qui n'existe pas encore : la page garde la
    # langue de l'appareil, qui sera celle du foyer.
    langue: str | None
    cree_un_foyer: bool


@dataclass
class VueInvitation:
    """Une invitation vue par le propriétaire de son foyer (jamais le jeton, perdu)."""

    id: int
    role: str
    libelle: str | None
    statut: str
    cree_le: datetime
    expire_le: datetime
    utilisee_le: datetime | None
    utilisee_par: str | None
    revoquee_le: datetime | None
    detenteur_ids: list[int]


def _maintenant() -> datetime:
    """Horodatage naïf (UTC implicite), comme le reste de l'authentification."""
    return datetime.now(UTC).replace(tzinfo=None)


def hacher_jeton(jeton: str) -> str:
    return hashlib.sha256(jeton.encode("utf-8")).hexdigest()


# --- Limitation de débit -----------------------------------------------------------


def verifier_debit(ip: str | None) -> None:
    """Lève `TropDeTentativesError` si cette adresse a échoué `SEUIL_ECHECS` fois en
    `FENETRE_ECHECS_MINUTES` minutes."""
    depuis = _maintenant() - timedelta(minutes=FENETRE_ECHECS_MINUTES)
    with _verrou_echecs:
        # Les adresses qui ne reviennent pas ne se purgeraient jamais d'elles-mêmes.
        for cle in [cle for cle, echecs in _echecs.items() if echecs[-1] <= depuis]:
            del _echecs[cle]
        recents = [t for t in _echecs.get(ip or "?", []) if t > depuis]
        if recents:
            _echecs[ip or "?"] = recents
        else:
            _echecs.pop(ip or "?", None)
    if len(recents) >= SEUIL_ECHECS:
        raise TropDeTentativesError(recents[0] + timedelta(minutes=FENETRE_ECHECS_MINUTES))


def noter_echec(ip: str | None) -> None:
    with _verrou_echecs:
        _echecs.setdefault(ip or "?", []).append(_maintenant())


# --- Côté propriétaire ---------------------------------------------------------------


def creer_invitation(
    db: Session,
    foyer_id: int,
    cree_par: int,
    *,
    role: str,
    libelle: str | None,
    duree_jours: int,
    detenteur_ids: list[int],
) -> tuple[VueInvitation, str]:
    """Crée l'invitation vers `foyer_id` et renvoie aussi son jeton en clair, que rien ne
    permettra de retrouver ensuite. Le périmètre d'un invité ne peut désigner que des
    détenteurs de CE foyer ; ignoré pour un membre, qui voit tout le foyer."""
    if role not in ROLES_ASSIGNABLES:
        raise ValueError(role)
    ids = sorted(set(detenteur_ids)) if role == ROLE_INVITE else []
    if ids:
        valides = db.query(Detenteur).filter(Detenteur.foyer_id == foyer_id, Detenteur.id.in_(ids)).count()
        if valides != len(ids):
            raise DetenteurInconnuError
    jeton = secrets.token_urlsafe(32)
    maintenant = _maintenant()
    invitation = Invitation(
        foyer_id=foyer_id,
        role=role,
        libelle=libelle,
        jeton_hash=hacher_jeton(jeton),
        cree_par=cree_par,
        cree_le=maintenant,
        expire_le=maintenant + timedelta(days=duree_jours),
    )
    db.add(invitation)
    db.flush()
    for detenteur_id in ids:
        db.add(InvitationPerimetre(invitation_id=invitation.id, detenteur_id=detenteur_id))
    db.commit()
    return _vue(invitation, None, ids, maintenant), jeton


def creer_invitation_foyer(
    db: Session, createur: User, *, libelle: str | None, duree_jours: int
) -> tuple[VueInvitation, str]:
    """Invitation à CRÉER un foyer (`foyer_id` vide, rôle `proprietaire`, figé ici). L'opérateur le
    peut toujours ; le propriétaire d'un foyer seulement si le mode de naissance est `invitation`
    (`CreationFoyerParInvitationRefuseeError` sinon). Renvoie aussi le jeton en clair."""
    if not createur.est_operateur and installation_service.mode_naissance(db) != installation_service.MODE_INVITATION:
        raise CreationFoyerParInvitationRefuseeError
    jeton = secrets.token_urlsafe(32)
    maintenant = _maintenant()
    invitation = Invitation(
        foyer_id=None,
        role=ROLE_PROPRIETAIRE,
        libelle=libelle,
        jeton_hash=hacher_jeton(jeton),
        cree_par=createur.id,
        cree_le=maintenant,
        expire_le=maintenant + timedelta(days=duree_jours),
    )
    db.add(invitation)
    db.commit()
    return _vue(invitation, None, [], maintenant), jeton


def _statut(invitation: Invitation, maintenant: datetime) -> str:
    if invitation.utilisee_le is not None:
        return STATUT_ACCEPTEE
    if invitation.revoquee_le is not None:
        return STATUT_REVOQUEE
    if invitation.expire_le <= maintenant:
        return STATUT_EXPIREE
    return STATUT_EN_ATTENTE


def _vue(invitation: Invitation, utilisee_par: str | None, detenteur_ids: list[int], maintenant: datetime) -> VueInvitation:
    return VueInvitation(
        id=invitation.id,
        role=invitation.role,
        libelle=invitation.libelle,
        statut=_statut(invitation, maintenant),
        cree_le=invitation.cree_le,
        expire_le=invitation.expire_le,
        utilisee_le=invitation.utilisee_le,
        utilisee_par=utilisee_par,
        revoquee_le=invitation.revoquee_le,
        detenteur_ids=detenteur_ids,
    )


def lister_invitations(db: Session, foyer_id: int) -> list[VueInvitation]:
    """Les invitations du foyer, les plus récentes d'abord, avec leur état et — pour une
    invitation acceptée — le nom du compte qui l'a acceptée."""
    invitations = (
        db.query(Invitation).filter(Invitation.foyer_id == foyer_id).order_by(Invitation.cree_le.desc(), Invitation.id.desc()).all()
    )
    if not invitations:
        return []
    perimetres: dict[int, list[int]] = {}
    for invitation_id, detenteur_id in (
        db.query(InvitationPerimetre.invitation_id, InvitationPerimetre.detenteur_id)
        .filter(InvitationPerimetre.invitation_id.in_([i.id for i in invitations]))
        .order_by(InvitationPerimetre.detenteur_id)
    ):
        perimetres.setdefault(invitation_id, []).append(detenteur_id)
    comptes = {i.utilisee_par for i in invitations if i.utilisee_par is not None}
    noms = dict(db.query(User.id, User.username).filter(User.id.in_(comptes)).all()) if comptes else {}
    maintenant = _maintenant()
    return [_vue(i, noms.get(i.utilisee_par), perimetres.get(i.id, []), maintenant) for i in invitations]


def _invitations_de_creation(db: Session, cree_par: int | None):
    """Les invitations à créer un foyer : celles de `cree_par` (le propriétaire qui en parraine),
    ou toutes (`None` : l'opérateur)."""
    requete = db.query(Invitation).filter(Invitation.foyer_id.is_(None))
    return requete if cree_par is None else requete.filter(Invitation.cree_par == cree_par)


def lister_invitations_foyer(db: Session, cree_par: int | None) -> list[VueInvitation]:
    """Les invitations à créer un foyer, les plus récentes d'abord, avec leur état et — pour une
    invitation acceptée — le nom du compte qui l'a acceptée."""
    invitations = _invitations_de_creation(db, cree_par).order_by(Invitation.cree_le.desc(), Invitation.id.desc()).all()
    comptes = {i.utilisee_par for i in invitations if i.utilisee_par is not None}
    noms = dict(db.query(User.id, User.username).filter(User.id.in_(comptes)).all()) if comptes else {}
    maintenant = _maintenant()
    return [_vue(i, noms.get(i.utilisee_par), [], maintenant) for i in invitations]


def revoquer_invitation_foyer(db: Session, cree_par: int | None, invitation_id: int) -> None:
    """Comme `revoquer_invitation`, pour une invitation à créer un foyer : celle d'un autre
    créateur est introuvable (l'opérateur, `cree_par = None`, les révoque toutes)."""
    existe = _invitations_de_creation(db, cree_par).filter(Invitation.id == invitation_id).first()
    if existe is None:
        raise InvitationIntrouvableError
    _revoquer(db, invitation_id)


def revoquer_invitation(db: Session, foyer_id: int, invitation_id: int) -> None:
    """Une invitation d'un AUTRE foyer est introuvable (IDOR). La révocation est un
    `UPDATE` conditionnel, comme l'acceptation : si celle-ci a gagné la course, la
    révocation échoue."""
    existe = db.query(Invitation.id).filter(Invitation.id == invitation_id, Invitation.foyer_id == foyer_id).first()
    if existe is None:
        raise InvitationIntrouvableError
    _revoquer(db, invitation_id)


def _revoquer(db: Session, invitation_id: int) -> None:
    resultat = db.execute(
        update(Invitation)
        .where(Invitation.id == invitation_id, Invitation.utilisee_le.is_(None), Invitation.revoquee_le.is_(None))
        .values(revoquee_le=_maintenant())
        .execution_options(synchronize_session=False)
    )
    db.commit()
    if resultat.rowcount != 1:
        raise InvitationNonRevocableError


# --- Côté public : consultation et acceptation -----------------------------------------


def _creation_autorisee(db: Session, invitation: Invitation) -> bool:
    """Une invitation à créer un foyer n'est valable que si l'opérateur l'a créée, ou si
    l'installation est (encore) en mode `invitation` : repasser en mode `ferme` éteint les
    liens qu'un propriétaire avait générés. Une invitation d'un foyer existant est toujours
    autorisée."""
    if invitation.foyer_id is not None:
        return True
    createur = db.get(User, invitation.cree_par) if invitation.cree_par is not None else None
    if createur is not None and createur.est_operateur:
        return True
    return installation_service.mode_naissance(db) == installation_service.MODE_INVITATION


def _invitation_utilisable(db: Session, hache: str, maintenant: datetime) -> tuple[Invitation, Foyer | None] | None:
    """L'invitation, avec son foyer — `None` pour une invitation à créer un foyer. Un foyer
    suspendu, et une création que le mode `ferme` n'autorise plus, la rendent introuvable."""
    trouve = (
        db.query(Invitation, Foyer)
        .outerjoin(Foyer, Foyer.id == Invitation.foyer_id)
        .filter(
            Invitation.jeton_hash == hache,
            Invitation.utilisee_le.is_(None),
            Invitation.revoquee_le.is_(None),
            Invitation.expire_le > maintenant,
            or_(Invitation.foyer_id.is_(None), Foyer.statut == STATUT_FOYER_ACTIF),
        )
        .first()
    )
    if trouve is None or not _creation_autorisee(db, trouve[0]):
        return None
    return trouve


def consulter(db: Session, jeton: str) -> ApercuInvitation:
    with database.tous_les_foyers_le_temps(db):
        trouve = _invitation_utilisable(db, hacher_jeton(jeton), _maintenant())
        if trouve is None:
            raise InvitationIntrouvableError
        invitation, foyer = trouve
        return ApercuInvitation(
            foyer_nom=foyer.nom if foyer is not None else None,
            role=invitation.role,
            libelle=invitation.libelle,
            langue=foyer.langue if foyer is not None else None,
            cree_un_foyer=foyer is None,
        )


def _reclamer(db: Session, hache: str, maintenant: datetime, utilisee_par: int) -> None:
    """Le verrou de l'usage unique : ne touche une ligne que si l'invitation est encore
    utilisable À CET INSTANT, quoi qu'ait lu l'appelant un peu plus tôt."""
    resultat = db.execute(
        update(Invitation)
        .where(
            Invitation.jeton_hash == hache,
            Invitation.utilisee_le.is_(None),
            Invitation.revoquee_le.is_(None),
            Invitation.expire_le > maintenant,
            or_(
                Invitation.foyer_id.is_(None),
                Invitation.foyer_id.in_(select(Foyer.id).where(Foyer.statut == STATUT_FOYER_ACTIF)),
            ),
        )
        .values(utilisee_le=maintenant, utilisee_par=utilisee_par)
        .execution_options(synchronize_session=False)
    )
    if resultat.rowcount != 1:
        raise InvitationIntrouvableError


def _rattacher(db: Session, invitation: Invitation, user_id: int, maintenant: datetime, langue: str | None) -> Appartenance:
    """L'appartenance au rôle figé par l'invitation, et le périmètre d'un invité. Un
    membre ou un invité ne rejoue pas l'assistant de bienvenue, réservé à celui qui
    crée son foyer. Les détenteurs se revérifient : ils ont pu quitter le foyer depuis
    la création de l'invitation.

    Une invitation à créer un foyer le fait naître ici, dans la langue de l'appareil de
    l'accepteur (`langue`, le français à défaut), dont il devient le propriétaire — et
    l'assistant de bienvenue se jouera."""
    if invitation.foyer_id is None:
        foyer = Foyer()
        if langue is not None:
            foyer.langue = langue
        db.add(foyer)
        db.flush()
        appartenance = Appartenance(user_id=user_id, foyer_id=foyer.id, role=ROLE_PROPRIETAIRE)
        db.add(appartenance)
        db.flush()
        return appartenance
    appartenance = Appartenance(user_id=user_id, foyer_id=invitation.foyer_id, role=invitation.role, assistant_termine_le=maintenant)
    db.add(appartenance)
    if invitation.role == ROLE_INVITE:
        detenteurs = (
            db.query(InvitationPerimetre.detenteur_id)
            .join(Detenteur, Detenteur.id == InvitationPerimetre.detenteur_id)
            .filter(InvitationPerimetre.invitation_id == invitation.id, Detenteur.foyer_id == invitation.foyer_id)
            .all()
        )
        for (detenteur_id,) in detenteurs:
            db.add(PerimetreInvite(user_id=user_id, detenteur_id=detenteur_id))
    db.flush()
    return appartenance


def accepter_nouveau_compte(db: Session, jeton: str, username: str, password: str, langue: str | None = None) -> User:
    """Crée le compte, son appartenance au foyer de l'invitation (ou le foyer que l'invitation
    fait naître, dans `langue`), et réclame l'invitation : tout ou rien."""
    hache = hacher_jeton(jeton)
    with database.tous_les_foyers_le_temps(db):
        maintenant = _maintenant()
        trouve = _invitation_utilisable(db, hache, maintenant)
        if trouve is None:
            raise InvitationIntrouvableError
        if auth_service.utilisateur_par_username(db, username) is not None:
            raise auth_service.NomUtilisateurPrisError
        # Le hachage, lent par conception, avant d'ouvrir l'écriture.
        user = User(username=username.strip(), password_hash=auth_service.hash_password(password))
        try:
            db.add(user)
            db.flush()
            _reclamer(db, hache, maintenant, user.id)
            _rattacher(db, trouve[0], user.id, maintenant, langue)
            db.commit()
        except IntegrityError as erreur:
            # Le nom d'utilisateur pris entre-temps : la seule contrainte qu'un compte
            # neuf puisse violer.
            db.rollback()
            raise auth_service.NomUtilisateurPrisError from erreur
        except Exception:
            db.rollback()
            raise
        db.refresh(user)
    return user


def accepter_compte_existant(db: Session, jeton: str, user: User, langue: str | None = None) -> Appartenance:
    """Ajoute le foyer de l'invitation aux appartenances du compte connecté — ou, pour une
    invitation à créer un foyer, le foyer neuf dont il devient propriétaire. Un compte
    opérateur est refusé d'emblée, quel que soit le jeton."""
    if user.est_operateur:
        raise auth_service.CompteOperateurError
    hache = hacher_jeton(jeton)
    with database.tous_les_foyers_le_temps(db):
        maintenant = _maintenant()
        trouve = _invitation_utilisable(db, hache, maintenant)
        if trouve is None:
            raise InvitationIntrouvableError
        invitation = trouve[0]
        if (
            invitation.foyer_id is not None
            and db.query(Appartenance).filter(Appartenance.user_id == user.id, Appartenance.foyer_id == invitation.foyer_id).first()
        ):
            raise DejaMembreError
        try:
            _reclamer(db, hache, maintenant, user.id)
            appartenance = _rattacher(db, invitation, user.id, maintenant, langue)
            db.commit()
        except IntegrityError as erreur:
            # Devenu membre entre-temps (deux acceptations simultanées du même compte).
            db.rollback()
            raise DejaMembreError from erreur
        except Exception:
            db.rollback()
            raise
        db.refresh(appartenance)
    return appartenance
