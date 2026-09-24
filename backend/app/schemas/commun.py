from __future__ import annotations

from datetime import datetime  # noqa: F401

from pydantic import BaseModel, ConfigDict, field_validator, model_validator  # noqa: F401


class ImportPreviewResponse(BaseModel):
    file_token: str
    columns: list[str]
    rows: list[dict]
    total_rows: int


class AllocationBreakdownItem(BaseModel):
    categorie: str
    valeur: float
    pourcentage_reel: float


class RepartitionItem(BaseModel):
    categorie: str
    poids: float  # fraction 0-1


class CategoryCompositionItem(BaseModel):
    # Adresse cette ligne sans ambiguïté (revu le 14/09/2026) : deux lignes peuvent
    # désormais partager un ticker (un compte chacune) — cf. `HoldingOut.id`.
    id: int
    ticker: str
    nom: str | None = None
    valeur: float


class CategoryCompositionResponse(BaseModel):
    type: str
    categorie: str
    valeur_totale: float
    lignes: list[CategoryCompositionItem]


class RepartitionParClasseItem(BaseModel):
    categorie: str
    valeur: float


class ZoneGeographiqueInfo(BaseModel):
    """Écran d'aide (FAQ) : une zone géographique et les pays qu'elle contient
    (`services/reference_indices.zones_geographiques`)."""

    zone: str
    pays: list[str]
    # Codes ISO 3166-1 alpha-2 des mêmes pays (§ BL) : le frontend les nomme dans la
    # langue du foyer ; `pays` reste le libellé français de référence.
    codes_pays: list[str] = []
