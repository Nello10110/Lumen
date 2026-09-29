"""Écritures « lire, puis insérer si absent » sur les tables à clé naturelle (caches
de résolution, de courbes, de logos, réglages des tâches planifiées) : quand une
requête concurrente a inséré la même clé entre la lecture et l'écriture, la seconde
ne doit ni échouer ni perdre le travail en attente de l'appelant.

SQLite sérialise les écritures et masquait le défaut ; sous Postgres (CI `e2e-postgres`),
la seconde insertion violait la clé primaire (`ticker_resolution_pkey`). La « requête
concurrente » est simulée par une seconde session qui valide sa ligne avant l'écriture
de la première."""

from datetime import datetime

import yfinance as yf
from sqlalchemy.orm import Session

from app.database import obtenir_ou_creer
from app.models import (
    HistoriqueCache,
    LogoCatalogue,
    MarketDataCache,
    ScheduledJobConfig,
    TickerResolution,
    User,
)
from app.services import historique_cache, market_data_service, scheduler_service


def _autre_requete(db: Session, *lignes) -> None:
    """Valide `lignes` depuis une autre session, comme le ferait une requête parallèle."""
    with Session(bind=db.get_bind()) as autre:
        autre.add_all(lignes)
        autre.commit()


def test_obtenir_ou_creer_renvoie_la_ligne_de_la_gagnante_sans_toucher_au_travail_en_attente(db):
    _autre_requete(db, MarketDataCache(ticker="ABC", nom="gagnante"))
    en_attente = User(username="en-attente", password_hash="x")
    db.add(en_attente)

    entree = obtenir_ou_creer(db, MarketDataCache, ticker="ABC", nom="perdante")
    db.commit()

    assert entree.nom == "gagnante"
    assert db.query(MarketDataCache).count() == 1
    # Un `rollback()` rattrapant l'`IntegrityError` aurait emporté cette ligne.
    assert db.query(User).filter_by(username="en-attente").count() == 1


def test_obtenir_ou_creer_cree_la_ligne_absente(db):
    entree = obtenir_ou_creer(db, MarketDataCache, ticker="NEUF", nom="créée")
    db.commit()

    assert entree.nom == "créée"
    assert db.get(MarketDataCache, "NEUF").nom == "créée"


def test_resolve_ticker_survit_a_une_resolution_inseree_pendant_la_recherche(db, monkeypatch):
    """Fenêtre exacte de la course : rien en cache à la lecture, la ligne apparaît
    pendant la recherche Yahoo, avant notre écriture."""

    def _recherche_pendant_laquelle_lautre_requete_gagne(*_a, **_k):
        _autre_requete(db, TickerResolution(identifiant="FR0000000000", ticker_resolu="GAGNANT.PA", quote_type="EQUITY"))
        return type("R", (), {"quotes": [{"symbol": "PERDANT.PA", "quoteType": "EQUITY"}]})()

    monkeypatch.setattr(yf, "Search", _recherche_pendant_laquelle_lautre_requete_gagne)

    assert market_data_service.resolve_ticker(db, "FR0000000000", "STOCK") == "GAGNANT.PA"
    assert db.get(TickerResolution, "FR0000000000").ticker_resolu == "GAGNANT.PA"


def test_historique_cache_ecrire_survit_a_une_entree_inseree_entre_temps(db):
    _autre_requete(db, HistoriqueCache(cle="courbe", contenu_json="[1]", derniere_maj=datetime(2026, 1, 1)))

    historique_cache.ecrire(db, "courbe", [2])

    assert historique_cache.lire(db, "courbe") == [2]


def test_config_de_tache_planifiee_survit_a_une_creation_concurrente(db):
    _autre_requete(db, ScheduledJobConfig(job_key=scheduler_service.LOGOS_REFRESH, intervalle_heures=99))

    config = scheduler_service.get_or_create_config(db, scheduler_service.LOGOS_REFRESH)

    assert config.intervalle_heures == 99
    assert db.query(ScheduledJobConfig).filter_by(job_key=scheduler_service.LOGOS_REFRESH).count() == 1


def test_cache_de_logos_du_catalogue_survit_a_une_creation_concurrente(db):
    _autre_requete(db, LogoCatalogue(logo_key="banque"))

    entree = obtenir_ou_creer(db, LogoCatalogue, logo_key="banque")
    db.commit()

    assert entree.logo_key == "banque"
    assert db.query(LogoCatalogue).count() == 1
