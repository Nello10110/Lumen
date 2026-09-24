from __future__ import annotations

from datetime import datetime  # noqa: F401

from pydantic import BaseModel, ConfigDict, field_serializer, field_validator, model_validator  # noqa: F401

from ..i18n import traduire_message


class MarketDataOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticker: str
    nom: str | None = None
    prix_actuel: float | None = None
    devise: str | None = None
    secteur: str | None = None
    pays: str | None = None
    region: str | None = None
    erreur: str | None = None
    derniere_maj: datetime

    @field_serializer("erreur")
    def _erreur_traduite(self, erreur: str | None) -> str | None:
        # Enregistrée en français par la tâche de rafraîchissement (hors requête, donc
        # sans langue) : traduite à l'envoi, dans la langue du foyer (§ BL.4).
        return traduire_message(erreur) if erreur else erreur


class EtatRafraichissement(BaseModel):
    """État du rafraîchissement des cours en tâche de fond (LOT 4B). Renvoyé par
    `POST /api/market-data/refresh` (202, état de démarrage) et
    `GET /api/market-data/refresh/status` (sondé par le frontend pendant que
    `en_cours` vaut `True`, notamment depuis la page Réglages — `POST
    /api/settings/jobs/{job_key}/run-now` déclenche le même exécuteur partagé,
    cf. `services/scheduler_service.run_job_now`)."""

    en_cours: bool
    positions_traitees: int
    positions_total: int
    demarre_le: datetime | None = None
    termine_le: datetime | None = None
    statut: str | None = None  # "ok" | "erreur" | None (jamais terminé, ou en cours)
    message: str | None = None

    @field_serializer("message")
    def _message_traduit(self, message: str | None) -> str | None:
        # Écrit par le fil de rafraîchissement, hors requête : traduit à l'envoi (§ BL.4).
        return traduire_message(message) if message else message


class DerniereActualisationResponse(BaseModel):
    """Backlog § AF.4 (révision du 21/09/2026, rapport utilisateur) : date du
    dernier rafraîchissement des cours RÉELLEMENT TENTÉ, tous déclencheurs
    confondus (planifié, "Lancer maintenant" de Réglages, "Actualiser"/"Rallumer
    les cours" de Portefeuille/Dashboard) — lue depuis `ScheduledJobConfig`
    (`services/scheduler_service.get_or_create_config`), jamais recalculée depuis
    `Holding.market_data.derniere_maj` position par position : cette dernière
    approche restait figée pour toute ligne STRUCTURELLEMENT jamais rafraîchie
    (ex. Bricks.co, jamais interrogée par construction, cf.
    `market_data_service.PREFIXES_SYMBOLES_INTERNES`), donnant à tort
    l'impression d'un portefeuille jamais actualisé alors que les vraies
    positions cotées l'étaient. `None` tant qu'aucun rafraîchissement n'a jamais
    été tenté sur cette installation."""

    derniere_actualisation: datetime | None
