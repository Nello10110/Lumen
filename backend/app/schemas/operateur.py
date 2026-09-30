"""Schémas de la console de l'opérateur (backlog § BK.2, lot BK.2d). Jamais un montant : des
noms, des statuts, des dates, des nombres de comptes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from ..services.installation_service import MODES_NAISSANCE

MESSAGE_MODE_NAISSANCE_INVALIDE = "Le mode de naissance des foyers doit être « ferme » ou « invitation »."


class FoyerOperateurOut(BaseModel):
    """Un foyer dans la console. `confirmation_attendue` : ce que l'opérateur tape pour
    confirmer la suppression (le nom du foyer, ou `SUPPRIMER` tant qu'il n'en a pas)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nom: str | None
    langue: str
    # `actif` | `suspendu`
    statut: str
    cree_le: datetime
    suspendu_le: datetime | None
    derniere_activite: datetime | None
    # Nom d'utilisateur du propriétaire ; `None` si le foyer n'en a plus.
    proprietaire: str | None
    nombre_comptes: int
    confirmation_attendue: str


class CompteFoyerOperateurOut(BaseModel):
    """Un compte d'un foyer, pour désigner un nouveau propriétaire : un nom et un rôle."""

    id: int
    username: str
    role: str


class DesignationProprietaire(BaseModel):
    membre_id: int


class CompteSansFoyerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime
    derniere_connexion: datetime | None


class SuppressionCompteSansFoyerRequest(BaseModel):
    """Confirmation par le nom d'utilisateur du compte à supprimer."""

    confirmation: str


class ReglagesInstallationOut(BaseModel):
    """Les réglages d'installation et l'état du moteur. `moteur` : `sqlite` ou `postgresql` ;
    `separation_par_la_base` faux sous SQLite (et sous un rôle Postgres qui contourne les
    politiques) : l'interface affiche alors « la séparation des foyers n'est assurée que par
    l'application »."""

    # `ferme` | `invitation`
    mode_naissance_foyers: str
    sso_cree_son_foyer: bool
    creation_foyer_par_compte_sans_foyer: bool
    moteur: str
    separation_par_la_base: bool


class ReglagesInstallationUpdate(BaseModel):
    """Seuls les champs fournis changent."""

    mode_naissance_foyers: str | None = None
    sso_cree_son_foyer: bool | None = None
    creation_foyer_par_compte_sans_foyer: bool | None = None

    @field_validator("mode_naissance_foyers")
    @classmethod
    def _valider_mode(cls, v: str | None) -> str | None:
        if v is not None and v not in MODES_NAISSANCE:
            raise ValueError(MESSAGE_MODE_NAISSANCE_INVALIDE)
        return v
