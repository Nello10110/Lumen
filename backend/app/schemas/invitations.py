from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from ..i18n import tr
from ..models import ROLES_ASSIGNABLES
from ..services.invitation_service import DUREE_PAR_DEFAUT_JOURS, DUREES_JOURS, LONGUEUR_MAX_LIBELLE
from .authentification import NouveauCompte, valider_langue_facultative

MESSAGE_ROLE_INVITATION_INVALIDE = "Le rôle doit être 'membre' ou 'invite'"
MESSAGE_DUREE_INVALIDE = "La durée d'une invitation doit être de 1, 7 ou 30 jours."
MESSAGE_LIBELLE_TROP_LONG = "Le libellé ne doit pas dépasser {maximum} caractères."


def _valider_duree(v: int) -> int:
    if v not in DUREES_JOURS:
        raise ValueError(MESSAGE_DUREE_INVALIDE)
    return v


def _valider_libelle(v: str | None) -> str | None:
    if v is None:
        return None
    v = v.strip()
    if len(v) > LONGUEUR_MAX_LIBELLE:
        raise ValueError(tr(MESSAGE_LIBELLE_TROP_LONG, maximum=LONGUEUR_MAX_LIBELLE))
    return v or None


class InvitationCreate(BaseModel):
    """Le rôle est figé ici, côté serveur : `proprietaire` n'est jamais invitable.
    `detenteur_ids` : le périmètre d'un invité, ignoré pour un membre."""

    role: str
    libelle: str | None = None
    duree_jours: int = DUREE_PAR_DEFAUT_JOURS
    detenteur_ids: list[int] = []

    @field_validator("role")
    @classmethod
    def _valider_role(cls, v: str) -> str:
        if v not in ROLES_ASSIGNABLES:
            raise ValueError(MESSAGE_ROLE_INVITATION_INVALIDE)
        return v

    _valider_duree = field_validator("duree_jours")(_valider_duree)
    _valider_libelle = field_validator("libelle")(_valider_libelle)


class InvitationFoyerCreate(BaseModel):
    """Invitation à CRÉER un foyer (§ BK.2d) : le rôle (`proprietaire`) est figé côté serveur, et
    il n'y a pas de périmètre — le foyer n'existe pas encore."""

    libelle: str | None = None
    duree_jours: int = DUREE_PAR_DEFAUT_JOURS

    _valider_duree = field_validator("duree_jours")(_valider_duree)
    _valider_libelle = field_validator("libelle")(_valider_libelle)


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    libelle: str | None
    # `en_attente` | `acceptee` | `revoquee` | `expiree`
    statut: str
    cree_le: datetime
    expire_le: datetime
    utilisee_le: datetime | None
    # Nom d'utilisateur du compte qui l'a acceptée ; `None` s'il a été supprimé depuis.
    utilisee_par: str | None
    revoquee_le: datetime | None
    detenteur_ids: list[int]


class InvitationCreeeOut(InvitationOut):
    """Réponse à la création, seule occasion de voir le jeton : il n'est stocké nulle part
    (seul son SHA-256 l'est). Le lien à transmettre est `<origine>/invitation#<jeton>`."""

    jeton: str


class JetonInvitation(BaseModel):
    """Le jeton voyage dans le CORPS des requêtes publiques, jamais dans l'URL (journaux
    de proxy, historique du navigateur)."""

    jeton: str

    @field_validator("jeton")
    @classmethod
    def _valider_jeton(cls, v: str) -> str:
        return v.strip()


class ApercuInvitationOut(BaseModel):
    """Ce que voit celui qui ouvre le lien, avant de s'engager."""

    model_config = ConfigDict(from_attributes=True)

    foyer_nom: str | None
    role: str
    libelle: str | None
    # `None` pour une invitation à créer un foyer : la page garde la langue de l'appareil.
    langue: str | None
    # Vrai pour une invitation à CRÉER un foyer (§ BK.2d) : l'accepteur en sera le propriétaire.
    cree_un_foyer: bool = False


class AcceptationNouveauCompte(JetonInvitation, NouveauCompte):
    """Le compte créé par l'acceptation, avec les règles de l'inscription. Sa langue est
    celle du foyer qui l'invite (§ BL : un réglage du foyer) ; pour une invitation à créer un
    foyer, `langue` est celle de l'appareil de l'accepteur, qui devient celle du foyer neuf."""

    langue: str | None = None

    _valider_langue = field_validator("langue")(valider_langue_facultative)


class AcceptationCompteExistant(JetonInvitation):
    """Un compte connecté accepte : `langue` ne sert qu'à une invitation à créer un foyer."""

    langue: str | None = None

    _valider_langue = field_validator("langue")(valider_langue_facultative)
