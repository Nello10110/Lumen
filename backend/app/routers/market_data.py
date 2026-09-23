"""Rafraîchissement des cours/composition ETF via yfinance (en tâche de fond,
LOT 4B) et lecture du cache."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db, session_tous_foyers
from ..models import Holding, MarketDataCache
from ..schemas import DerniereActualisationResponse, EtatRafraichissement, MarketDataOut
from ..services import market_data_refresh, scheduler_service

router = APIRouter(prefix="/api/market-data", tags=["market-data"])


def _enregistrer_resultat(etat) -> None:
    """`on_termine` de `demarrer_rafraichissement` ci-dessous — même patron que
    `scheduler_service.run_job_now` pour `MARKET_DATA_REFRESH` (§ AF.4, révision du
    21/09/2026) : persiste le résultat dans `ScheduledJobConfig` pour QUE CE
    DÉCLENCHEMENT MANUEL COMPTE LUI AUSSI dans « quand les cours ont-ils été
    actualisés pour la dernière fois » (`GET /derniere-actualisation` ci-dessous) —
    jusqu'ici seuls le job planifié et « Lancer maintenant » de Réglages
    l'alimentaient, ce bouton-ci restait invisible de cette date. Session dédiée :
    ce callback s'exécute dans le fil de fond, bien après que la session de la
    requête HTTP qui a déclenché ce rafraîchissement a été refermée."""
    db_statut = session_tous_foyers()
    try:
        scheduler_service.record_result(
            db_statut, scheduler_service.MARKET_DATA_REFRESH, etat.statut or "erreur", etat.message or ""
        )
    finally:
        db_statut.close()


@router.post("/refresh", response_model=EtatRafraichissement, status_code=202)
def refresh(db: Session = Depends(get_db)):
    """Démarre un rafraîchissement en tâche de fond et renvoie tout de suite l'état
    de démarrage (202, LOT 4.7/4B) — plus la liste complète du cache comme avant :
    sur le portefeuille réel de l'utilisateur, un rafraîchissement complet dépasse
    largement la minute, et le frontend rappelle de toute façon `listHoldings()`
    juste après. Le frontend suit la progression via `GET /refresh/status`.

    Délai minimal entre deux rafraîchissements manuels (LOT 7.5, inchangé) : le
    rafraîchissement planifié (`scheduler_service`) appelle directement
    `market_data_service.refresh_tickers`, sans passer par cette route, et n'est
    donc pas concerné. `409` en complément si un rafraîchissement (déclenché depuis
    cette route ou depuis `POST /api/settings/jobs/{job_key}/run-now`) est déjà en
    cours — le garde-fou de fréquence n'empêche pas ce cas, un rafraîchissement
    pouvant encore tourner plus de `DELAI_MINIMAL_ENTRE_RAFRAICHISSEMENTS_SECONDES`
    après son déclenchement."""
    try:
        market_data_refresh.verifier_et_enregistrer_rafraichissement_manuel()
    except market_data_refresh.RafraichissementTropFrequentError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    # Intentionnellement NON filtré par utilisateur (Milestone 2a, cf. docs/BACKLOG.md
    # § 2.I.1) : le cache de marché (MarketDataCache, FundComposition...) reste
    # global, partagé par tous les comptes — ce rafraîchissement doit donc couvrir
    # tous les tickers détenus par tout le monde, pas seulement ceux de qui l'a
    # déclenché.
    items = [(row[0], row[1]) for row in db.query(Holding.ticker, Holding.type_actif).distinct().all()]
    try:
        return market_data_refresh.demarrer_rafraichissement(items, on_termine=_enregistrer_resultat)
    except market_data_refresh.RafraichissementDejaEnCoursError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("/refresh/status", response_model=EtatRafraichissement)
def refresh_status():
    return market_data_refresh.etat_rafraichissement()


@router.get("/derniere-actualisation", response_model=DerniereActualisationResponse)
def derniere_actualisation(db: Session = Depends(get_db)):
    """Backlog § AF.4 (révision du 21/09/2026) — voir la docstring de
    `DerniereActualisationResponse` pour le contexte complet."""
    config = scheduler_service.get_or_create_config(db, scheduler_service.MARKET_DATA_REFRESH)
    return DerniereActualisationResponse(derniere_actualisation=config.derniere_execution)


@router.get("", response_model=list[MarketDataOut])
def list_market_data(db: Session = Depends(get_db)):
    return db.query(MarketDataCache).all()
