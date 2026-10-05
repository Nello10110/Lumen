from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ValidationInfo, field_validator, model_validator

from ..i18n import tr
from .detenteurs import QuotiteEntree
from .emprunts import LoanOut
from .portefeuille import (
    MESSAGE_CHARGES_NON_NEGATIVES,
    MESSAGE_FRAIS_ACQUISITION_AUTRES_NON_NEGATIFS,
    MESSAGE_FRAIS_NON_NEGATIFS,
    MESSAGE_FRAIS_NOTAIRE_NON_NEGATIFS,
    MESSAGE_FRAIS_TRAVAUX_NON_NEGATIFS,
    MESSAGE_LOYER_NON_NEGATIF,
    MESSAGE_LOYER_SIMULATION_NON_NEGATIF,
    MESSAGE_SURFACE_POSITIVE,
    MESSAGE_TAXE_HABITATION_NON_NEGATIVE,
    HoldingOut,
)
from .validateurs import MESSAGE_VALEUR_ESTIMEE_NON_NEGATIVE, _valider_date_jour_non_future

LONGUEUR_MAX_NOM = 120

# Un seul validateur pour tous les montants « positif ou nul » de la saisie, chacun avec
# SON message (déjà au catalogue, repris de `HoldingImmobilierUpdate`/`HoldingBase`).
_MESSAGES_MONTANTS_NON_NEGATIFS = {
    "valeur_estimee": MESSAGE_VALEUR_ESTIMEE_NON_NEGATIVE,
    "frais_notaire": MESSAGE_FRAIS_NOTAIRE_NON_NEGATIFS,
    "frais_travaux": MESSAGE_FRAIS_TRAVAUX_NON_NEGATIFS,
    "frais_acquisition_autres": MESSAGE_FRAIS_ACQUISITION_AUTRES_NON_NEGATIFS,
    "loyer_mensuel": MESSAGE_LOYER_NON_NEGATIF,
    "charges_mensuelles": MESSAGE_CHARGES_NON_NEGATIVES,
    "frais_annuels": MESSAGE_FRAIS_NON_NEGATIFS,
    "simulation_loyer_estime": MESSAGE_LOYER_SIMULATION_NON_NEGATIF,
    "simulation_taxe_habitation_annuelle": MESSAGE_TAXE_HABITATION_NON_NEGATIVE,
}


class PretNouveau(BaseModel):
    """Emprunt créé avec le bien (`BienImmobilierCreate.pret`) — mêmes règles que
    `LoanBase`, en `Decimal` : le montant saisi arrive intact jusqu'à la base, sans
    détour par un flottant. Pas de `capital_restant_du_manuel` : un prêt qu'on vient de
    souscrire n'a rien à recaler."""

    libelle: str
    capital_initial: Decimal
    taux_annuel_pct: Decimal
    mensualite: Decimal
    date_debut: datetime
    duree_mois: int
    # Établissement du CRÉDIT, facultatif — cf. `LoanCreate.etablissement_id`. Son
    # appartenance au foyer est vérifiée par le service (pas d'accès base ici).
    etablissement_id: int | None = None

    @field_validator("libelle")
    @classmethod
    def _valider_libelle(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le libellé de l'emprunt ne peut pas être vide")
        return v

    @field_validator("capital_initial")
    @classmethod
    def _valider_capital_initial(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Le capital initial doit être strictement positif")
        return v

    @field_validator("taux_annuel_pct")
    @classmethod
    def _valider_taux(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Le taux annuel ne peut pas être négatif")
        return v

    @field_validator("mensualite")
    @classmethod
    def _valider_mensualite(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("La mensualité doit être strictement positive")
        return v

    @field_validator("duree_mois")
    @classmethod
    def _valider_duree(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("La durée doit être strictement positive (en mois)")
        return v


class BienImmobilierCreate(BaseModel):
    """Création d'un bien immobilier EN UNE FOIS (backlog § BN.1, lot 2) : la ligne du
    patrimoine, sa fiche locative, sa valorisation initiale, son prêt éventuel et la
    répartition entre membres, dans une seule transaction (cf.
    `services/bien_immobilier_service.py`). Les montants sont des `Decimal`, pas des
    `float`, contrairement à `HoldingCreate`.

    Le client n'envoie ni ticker (dérivé du nom par le serveur) ni type d'actif (toujours
    `REAL_ESTATE`). `usage` n'est pas une colonne : il décide quels champs locatifs sont
    gardés (cf. `bien_immobilier_service._champs_detail`) et se relit ensuite par
    `residence_principale` et par la présence d'un `loyer_mensuel` — d'où le loyer
    obligatoire (0 admis) pour un bien locatif, seul signe qui le distingue d'un bien
    « autre »."""

    nom: str
    usage: Literal["residence_principale", "locatif", "autre"]
    prix_achat: Decimal
    # AAAA-MM-JJ, jamais dans le futur — comme `HoldingBase.date_acquisition`.
    date_achat: str | None = None
    # Valeur actuelle estimée ; absente, le serveur retient le prix d'achat.
    valeur_estimee: Decimal | None = None
    frais_notaire: Decimal | None = None
    frais_travaux: Decimal | None = None
    frais_acquisition_autres: Decimal | None = None
    surface_m2: Decimal | None = None
    zone_geo: str | None = None
    # Champs dont l'usage dépend de `usage` : ceux qui ne s'appliquent pas sont stockés
    # à `None`, sans erreur (un formulaire qui change d'usage en cours de saisie n'a pas
    # à les vider lui-même).
    loyer_mensuel: Decimal | None = None
    charges_mensuelles: Decimal | None = None
    frais_annuels: Decimal | None = None
    simulation_loyer_estime: Decimal | None = None
    simulation_taxe_habitation_annuelle: Decimal | None = None
    compte_id: int | None = None
    # Au plus un des deux : un emprunt neuf, ou un emprunt déjà saisi à rattacher.
    pret: PretNouveau | None = None
    pret_existant_id: int | None = None
    # Répartition du bien entre membres du foyer ; absente (`None`) = la règle par défaut du foyer
    # (§ BN.1, lot 3) ; liste vide = « ne pas répartir ». Le prêt n'a pas de quotités propres :
    # il suit celles du bien.
    quotites: list[QuotiteEntree] | None = None

    @field_validator("nom")
    @classmethod
    def _valider_nom(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le nom du bien ne peut pas être vide")
        if len(v) > LONGUEUR_MAX_NOM:
            raise ValueError("Le nom du bien ne peut pas dépasser 120 caractères")
        return v

    @field_validator("prix_achat")
    @classmethod
    def _valider_prix_achat(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Le prix d'achat doit être strictement positif")
        return v

    @field_validator("date_achat")
    @classmethod
    def _valider_date_achat(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _valider_date_jour_non_future(v, tr("La date d'achat"))

    @field_validator(*_MESSAGES_MONTANTS_NON_NEGATIFS)
    @classmethod
    def _valider_montants_non_negatifs(cls, v: Decimal | None, info: ValidationInfo) -> Decimal | None:
        if v is not None and v < 0:
            raise ValueError(_MESSAGES_MONTANTS_NON_NEGATIFS[info.field_name])
        return v

    @field_validator("surface_m2")
    @classmethod
    def _valider_surface(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError(MESSAGE_SURFACE_POSITIVE)
        return v

    @field_validator("zone_geo")
    @classmethod
    def _valider_zone_geo(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return v.strip() or None

    @model_validator(mode="after")
    def _valider_coherence(self) -> BienImmobilierCreate:
        if self.pret is not None and self.pret_existant_id is not None:
            raise ValueError("Renseignez soit un nouvel emprunt, soit un emprunt existant, pas les deux")
        if self.usage == "locatif" and self.loyer_mensuel is None:
            raise ValueError("Le loyer mensuel est obligatoire pour un bien locatif (indiquez 0 si le bien est vide)")
        return self


class BienImmobilierCree(BaseModel):
    """Ce que `POST /api/portfolio/biens-immobiliers` renvoie : la ligne créée et son
    prêt (`capital_restant_du` calculé par le serveur, comme `GET /api/loans`) —
    `None` si le bien n'a pas d'emprunt."""

    holding: HoldingOut
    pret: LoanOut | None = None
