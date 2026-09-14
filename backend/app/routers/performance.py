"""Rentabilité globale du portefeuille (snapshot actuel) et son évolution dans le temps."""

import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Compte, Holding, User
from ..schemas import (
    BenchmarkOption,
    ComparaisonBenchmark,
    DividendeMois,
    MetriquesAvancees,
    PerformanceSummary,
    PortfolioHistoryResponse,
    RapportPeriode,
    RevenusPassifsProjetes,
)
from ..services import (
    auth_service,
    historical_performance_service,
    metriques_performance_service,
    patrimoine_history_service,
    performance_service,
    rapport_service,
    revenus_passifs_service,
)

_MOTIF_DATE_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")

router = APIRouter(prefix="/api/performance", tags=["performance"])


@router.get("", response_model=PerformanceSummary)
def get_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return performance_service.compute_performance(db, auth_service.id_foyer(current_user))


@router.get("/history", response_model=PortfolioHistoryResponse)
def get_portfolio_history(
    type_actif: str | None = None,
    compte_id: int | None = None,
    etablissement_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """`type_actif`/`compte_id`/`etablissement_id` (graphique filtrable de l'écran
    Analyse, retour utilisateur du 13/09/2026) : optionnels, `type_actif` combinable
    avec l'un des deux autres, mais `compte_id`/`etablissement_id` mutuellement
    exclusifs (un seul niveau de granularité à la fois, plus simple à lire qu'un
    établissement filtré puis un compte qui le restreindrait encore). Résolus ici en
    un ensemble de couples `(ticker, compte_id)` plutôt que de simples tickers
    (corrigé le 14/09/2026 : un filtre par ticker seul incluait à tort la part d'un
    AUTRE compte partageant ce ticker — `Transaction.compte_id` existe désormais,
    `historical_performance_service` filtre sur la position exacte, plus une
    approximation). Tous absents : comportement strictement inchangé (portefeuille
    entier), même appel qu'avant cette fonctionnalité."""
    if compte_id is not None and etablissement_id is not None:
        raise HTTPException(status_code=400, detail="compte_id et etablissement_id sont mutuellement exclusifs.")

    user_id = auth_service.id_foyer(current_user)
    cles_filtres = None
    if type_actif is not None or compte_id is not None or etablissement_id is not None:
        requete = db.query(Holding.ticker, Holding.compte_id).filter(Holding.user_id == user_id)
        if type_actif is not None:
            requete = requete.filter(Holding.type_actif == type_actif)
        if compte_id is not None:
            requete = requete.filter(Holding.compte_id == compte_id)
        if etablissement_id is not None:
            requete = requete.join(Compte, Holding.compte_id == Compte.id).filter(Compte.etablissement_id == etablissement_id)
        cles_filtres = {(ticker, compte_id) for ticker, compte_id in requete.all()}
    points = historical_performance_service.compute_portfolio_history(db, user_id, cles_filtres=cles_filtres)
    return PortfolioHistoryResponse(points=points)


@router.get("/metriques-avancees", response_model=MetriquesAvancees)
def get_metriques_avancees(
    lentille: str = "financier", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """TWR, volatilité annualisée, max drawdown et récupération (backlog 2.P.2) —
    calculées sur la même série que `/history` en lentille "financier" (comportement
    historique, par défaut), ou sur l'historique combiné du patrimoine en lentille
    "brut"/"net" (retour utilisateur du 09/09/2026), jamais un second calcul de fond."""
    if lentille not in patrimoine_history_service.LENTILLES_VALIDES:
        raise HTTPException(status_code=400, detail="Lentille invalide")
    points = patrimoine_history_service.points_pour_lentille(db, auth_service.id_foyer(current_user), lentille)
    return metriques_performance_service.compute_metriques_avancees(points)


@router.get("/benchmarks", response_model=list[BenchmarkOption])
def list_benchmarks():
    """Liste fermée d'indices de référence proposés (backlog 2.P.2) — jamais un
    ticker arbitraire saisi par l'utilisateur."""
    return [
        BenchmarkOption(key=key, label=b["label"]) for key, b in historical_performance_service.BENCHMARKS.items()
    ]


@router.get("/comparaison-benchmark", response_model=ComparaisonBenchmark)
def get_comparaison_benchmark(
    benchmark: str, lentille: str = "financier", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if lentille not in patrimoine_history_service.LENTILLES_VALIDES:
        raise HTTPException(status_code=400, detail="Lentille invalide")
    points = patrimoine_history_service.points_pour_lentille(db, auth_service.id_foyer(current_user), lentille)
    resultat = historical_performance_service.compute_benchmark_history(db, benchmark, points)
    if resultat is None:
        raise HTTPException(status_code=404, detail="Indice de référence inconnu, ou aucune donnée disponible pour cette période.")
    return resultat


@router.get("/revenus-passifs", response_model=RevenusPassifsProjetes)
def get_revenus_passifs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Revenus passifs projetés à 12 mois (backlog 2.P.3, absorbe C.2) — certain
    (loyers nets, intérêts de livrets) vs estimé (dividendes/intérêts de courtage,
    extrapolés depuis les 12 derniers mois réellement perçus)."""
    return revenus_passifs_service.compute_revenus_passifs(db, auth_service.id_foyer(current_user))


@router.get("/dividendes", response_model=list[DividendeMois])
def get_dividend_calendar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Calendrier des dividendes perçus, mois par mois (roadmap Phase 3, § C.1)."""
    return performance_service.compute_dividend_calendar(db, auth_service.id_foyer(current_user))


@router.get("/rapport", response_model=RapportPeriode)
def get_rapport_periode(
    date_debut: str, date_fin: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Rapport récapitulatif sur une période arbitraire (roadmap Phase 4, § D.2 —
    étendu à l'annuel et aux périodes personnalisées), généré à la demande — cf.
    docstring de `rapport_service.compute_rapport_periode`. `date_debut`/`date_fin`
    au format `AAAA-MM-JJ` (bornes inclusives) : le mensuel et l'annuel de l'écran
    ne sont que des raccourcis qui calculent ces bornes côté client avant d'appeler
    ce même endpoint générique."""
    if not _MOTIF_DATE_ISO.match(date_debut) or not _MOTIF_DATE_ISO.match(date_fin):
        raise HTTPException(status_code=400, detail="date_debut et date_fin doivent être au format AAAA-MM-JJ")
    if date_fin < date_debut:
        raise HTTPException(status_code=400, detail="date_fin doit être postérieure ou égale à date_debut")
    return rapport_service.compute_rapport_periode(db, date_debut, date_fin, auth_service.id_foyer(current_user))
