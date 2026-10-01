from __future__ import annotations

from datetime import datetime  # noqa: F401

from pydantic import BaseModel, ConfigDict, field_validator, model_validator  # noqa: F401

from ..i18n import tr
from ..models import ROLES_ASSIGNABLES
from ..services.preferences_service import LANGUES_DISPONIBLES

MESSAGE_MOT_DE_PASSE_TROP_COURT = "Le mot de passe doit contenir au moins 8 caractères"
MESSAGE_NOM_UTILISATEUR_INVALIDE = "Le nom d'utilisateur doit contenir entre 2 et 32 caractères"
MESSAGE_LANGUE_INCONNUE = "Langue non proposée : {langues}"


def valider_langue(v: str) -> str:
    if v not in LANGUES_DISPONIBLES:
        raise ValueError(tr(MESSAGE_LANGUE_INCONNUE, langues=", ".join(LANGUES_DISPONIBLES)))
    return v


def valider_langue_facultative(v: str | None) -> str | None:
    return None if v is None else valider_langue(v)


class NouveauCompte(BaseModel):
    """Identifiants d'un compte qu'on crée : nom d'utilisateur et mot de passe, avec les règles
    de l'inscription."""

    username: str
    password: str

    @field_validator("username")
    @classmethod
    def _valider_username(cls, v: str) -> str:
        v = v.strip()
        if not (2 <= len(v) <= 32):
            raise ValueError(MESSAGE_NOM_UTILISATEUR_INVALIDE)
        return v

    @field_validator("password")
    @classmethod
    def _valider_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError(MESSAGE_MOT_DE_PASSE_TROP_COURT)
        return v


class RegisterRequest(NouveauCompte):
    # Langue dans laquelle le premier compte crée son foyer (backlog § BL) : celle que
    # l'écran de connexion affichait déjà (dernier choix sur cet appareil, ou langue
    # du navigateur). Facultative — absente, le foyer reste au défaut, le français.
    langue: str | None = None

    _valider_langue = field_validator("langue")(valider_langue_facultative)


class OperateurCreate(NouveauCompte):
    """Le compte opérateur, créé par le propriétaire tant qu'aucun n'existe (§ BK.2d)."""


class OperateurOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class FoyerResume(BaseModel):
    """Un foyer du sélecteur : son nom (`None` tant qu'il n'en a pas) et le rôle du
    compte DANS ce foyer."""

    id: int
    nom: str | None
    role: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    # Rôle dans le foyer courant (§ BK.2) ; `None` pour un compte qui n'appartient à
    # aucun foyer.
    role: str | None
    # Métadonnées d'affichage pures (backlog SSO, claim mapping) — `None` pour un
    # compte mot de passe local, jamais utilisées pour l'authentification.
    email: str | None = None
    nom: str | None = None
    # Assistant de configuration initiale (welcome board) : pas une colonne de `User`,
    # propre à l'appartenance au foyer courant (`auth_service.assistant_termine`)
    # et posé explicitement par `routers/auth.py` sur chaque réponse contenant un
    # `UserOut` — jamais rempli automatiquement par `model_validate`, absent de `User`.
    onboarding_termine: bool = False
    # Écran de rattrapage bloquant (revue du 03/09/2026, compte obligatoire sur une
    # ligne financière) : pas une colonne de `User`, calculé depuis
    # `comptes_service.compter_holdings_sans_compte` et posé explicitement par
    # `routers/auth.py` sur chaque réponse contenant un `UserOut` — même patron que
    # `onboarding_termine` ci-dessus. Tant que > 0, le frontend affiche l'écran de
    # rattrapage plutôt que l'application (sauf pour un `invite`, lecture seule, qui
    # ne peut rien y corriger).
    holdings_sans_compte: int = 0
    # Nom libre du foyer (revue du 05/09/2026, gestion du foyer dans sa globalité) :
    # pas une colonne de `User`, calculé depuis
    # `preferences_service.lire_nom_foyer` et posé explicitement par
    # `routers/auth.py` — même patron que `onboarding_termine` ci-dessus. `None`
    # tant qu'aucun nom n'a été renseigné.
    foyer_nom: str | None = None
    # Langue d'affichage du foyer (backlog § BL) : `preferences_service.lire_langue_foyer`,
    # posée par `routers/auth.py` comme `foyer_nom` — l'interface s'y aligne dès la
    # connexion, sans appel supplémentaire.
    langue: str = "fr"
    # Foyers (§ BK.2b) : ceux que le compte peut ouvrir (actifs seulement), et le foyer
    # courant de SA session (`None` : session sans foyer). `peut_creer_foyer` : l'écran
    # « aucun foyer » propose-t-il d'en créer un ? Posés par `routers/auth.py`.
    foyers: list[FoyerResume] = []
    foyer_courant_id: int | None = None
    peut_creer_foyer: bool = False
    # Administrateur de l'installation (§ BK.2d) : aucun foyer, une console à la place de
    # l'application. Lu sur le compte (`User.est_operateur`).
    est_operateur: bool = False
    # Un opérateur existe-t-il sur cette installation ? Si oui, les réglages d'installation
    # (tâches planifiées, logo SSO) ne sont plus ceux du propriétaire. Et le propriétaire
    # peut-il en créer un (`POST /api/auth/operateur`) : aucun n'existe et un seul foyer.
    operateur_existe: bool = False
    peut_amorcer_operateur: bool = False
    # Le propriétaire peut-il inviter un proche à créer SON foyer (`POST /api/invitations/foyer`) ?
    # Oui en mode de naissance `invitation` de l'installation, non en `ferme` : l'interface n'y
    # propose la section qu'alors, sans deviner par un 403.
    peut_inviter_a_creer_foyer: bool = False
    # Le compte est-il lié à une identité SSO (« Lier mon compte SSO » / « Délier ») ?
    sso_lie: bool = False


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class OidcStatus(BaseModel):
    enabled: bool
    # Texte choisi par variable d'environnement (`PATRIMOINE_OIDC_DISPLAY_NAME`) pour
    # le bouton de connexion — jamais un nom de fournisseur figé dans le code, cf.
    # `oidc_service.DISPLAY_NAME_PAR_DEFAUT`.
    display_name: str = "SSO"
    # Logo du bouton, en data URI (retour utilisateur du 22/09/2026), posé depuis
    # les Réglages — pas par variable d'environnement, cf.
    # `services/logo_oidc_service.py`. `None` tant qu'aucun logo n'est configuré :
    # le bouton n'affiche alors que `display_name`, comme avant ce lot.
    logo: str | None = None


class LienSsoOut(BaseModel):
    """Adresse d'autorisation du fournisseur SSO, où le navigateur doit se rendre pour lier son
    compte. Une route authentifiée la renvoie, plutôt qu'une redirection : une navigation ne
    porte pas l'en-tête `Authorization`."""

    url: str


class LiaisonSsoConfirmation(BaseModel):
    """Le code que le rappel du SSO a transmis à l'interface (`?oidc_liaison=<code>`)."""

    code: str


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_session: str
    created_at: datetime
    expires_at: datetime
    derniere_utilisation: datetime
    ip: str | None
    user_agent: str | None
    est_courante: bool = False


class AccessLogEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    username_saisi: str
    ip: str | None
    action: str
    resultat: str
    raison: str | None


class HouseholdMemberCreate(BaseModel):
    username: str
    password: str
    role: str
    # Détenteurs auxquels un compte "invite" a accès en lecture (2.L.2) — ignoré
    # pour un compte "membre" (accès de type par ressource, pas par détenteur).
    detenteur_ids: list[int] = []

    @field_validator("username")
    @classmethod
    def _valider_username(cls, v: str) -> str:
        v = v.strip()
        if not (2 <= len(v) <= 32):
            raise ValueError(MESSAGE_NOM_UTILISATEUR_INVALIDE)
        return v

    @field_validator("password")
    @classmethod
    def _valider_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError(MESSAGE_MOT_DE_PASSE_TROP_COURT)
        return v

    @field_validator("role")
    @classmethod
    def _valider_role(cls, v: str) -> str:
        if v not in ROLES_ASSIGNABLES:
            raise ValueError("Le rôle doit être 'membre' ou 'invite'")
        return v


class HouseholdMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    created_at: datetime
    detenteur_ids: list[int] = []
    email: str | None = None
    nom: str | None = None
    # Écran d'administration des comptes (Réglages → Comptes & sécurité) : `None` =
    # compte mot de passe local, une chaîne = provisionné/lié via ce fournisseur SSO
    # (son `display_name`, cf. `oidc_service.charger_config` — pas seulement un
    # booléen, pour afficher directement lequel). Posé explicitement par
    # `routers/auth.py`, jamais rempli par `model_validate` (calculé, pas une
    # colonne de `User`).
    oidc_display_name: str | None = None
    # Calculés depuis le journal d'accès/les jetons de session, jamais des colonnes
    # de `User` — mêmes conventions que `oidc_display_name` ci-dessus.
    derniere_connexion: datetime | None = None
    sessions_actives: int = 0
    verrouille_jusqua: datetime | None = None


class HouseholdMemberUpdate(BaseModel):
    """Modification d'un compte du foyer (revue du 04/09/2026) — rôle et/ou nom
    d'utilisateur, chacun facultatif (mise à jour partielle). Jamais utilisé sur le
    propriétaire lui-même : `update_household_member` (routers/auth.py) refuse toute
    modification sur son propre compte, via le même garde IDOR que la suppression
    (`_membre_du_foyer` : un membre ou un invité du foyer courant, rien d'autre)."""

    role: str | None = None
    username: str | None = None

    @field_validator("role")
    @classmethod
    def _valider_role(cls, v: str | None) -> str | None:
        if v is not None and v not in ROLES_ASSIGNABLES:
            raise ValueError("Le rôle doit être 'membre' ou 'invite'")
        return v

    @field_validator("username")
    @classmethod
    def _valider_username(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not (2 <= len(v) <= 32):
            raise ValueError(MESSAGE_NOM_UTILISATEUR_INVALIDE)
        return v


MESSAGE_NOM_FOYER_INVALIDE = "Le nom du foyer doit contenir entre 1 et 60 caractères."


class FoyerNomUpdate(BaseModel):
    nom: str

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str) -> str:
        v = v.strip()
        if not (1 <= len(v) <= 60):
            raise ValueError(MESSAGE_NOM_FOYER_INVALIDE)
        return v


class LangueFoyerUpdate(BaseModel):
    langue: str

    _valider = field_validator("langue")(valider_langue)


class FoyerCourantUpdate(BaseModel):
    foyer_id: int


class FoyerCreate(BaseModel):
    """Un compte sans foyer crée le sien. `langue` : celle de l'appareil, comme à
    l'inscription du premier compte."""

    nom: str | None = None
    langue: str = "fr"

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if len(v) > 60:
            raise ValueError(MESSAGE_NOM_FOYER_INVALIDE)
        return v

    _valider_langue = field_validator("langue")(valider_langue)


class SuppressionCompteRequest(BaseModel):
    """Confirmation par le nom d'utilisateur, comme la remise à zéro d'un foyer l'est par
    son nom."""

    confirmation: str


class SuppressionFoyerRequest(BaseModel):
    """Confirmation de la suppression du foyer : son nom (ou `SUPPRIMER` tant qu'il n'en a
    pas), comme la remise à zéro (`routers/donnees.py::effacer`). Comparée côté serveur,
    à `foyer_service.confirmation_attendue`."""

    confirmation: str


class TransfertProprieteRequest(BaseModel):
    """Le propriétaire confie son foyer à un membre. `confirmation` : le nom d'utilisateur
    de ce membre, tapé par le propriétaire."""

    membre_id: int
    confirmation: str


class ApercuSuppressionFoyerOut(BaseModel):
    """Ce que la suppression du foyer courant effacera — des nombres, jamais un montant.
    `patrimoine` : lignes par table de l'export (mêmes noms que l'aperçu d'un import), les
    tables vides omises. `comptes_sans_foyer` : comptes dont c'est le seul foyer, qui
    seront conservés SANS foyer ; `comptes_gardant_un_foyer` : ceux qui appartiennent à un
    autre foyer."""

    foyer_nom: str | None
    confirmation_attendue: str
    patrimoine: dict[str, int]
    liens_partage: int
    invitations: int
    comptes: int
    comptes_sans_foyer: int
    comptes_gardant_un_foyer: int


class FoyerBloquantOut(BaseModel):
    """Foyer dont le compte est propriétaire et qui compte `autres_comptes` autres comptes."""

    id: int
    nom: str | None
    autres_comptes: int


class ApercuSuppressionCompteOut(BaseModel):
    """Ce qu'entraîne la suppression de son propre compte. `foyers_supprimes` disparaissent
    avec lui (propriétaire et seul compte) ; `foyers_quittes` : il n'y perd que sa place ;
    `foyers_bloquants` : à transférer ou à supprimer d'abord — la suppression est refusée
    (409) tant qu'il y en a."""

    confirmation_attendue: str
    foyers_supprimes: list[FoyerResume]
    foyers_quittes: list[FoyerResume]
    foyers_bloquants: list[FoyerBloquantOut]
    peut_supprimer: bool
