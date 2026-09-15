"""Verrouille `holding_detail_service.build_holding_detail` pour la classe d'actif
CRYPTO (15/09/2026, retour utilisateur : une crypto Ledger "PKN" affichait des
informations d'un titre coté sans rapport — Orlen S.A. — via `resolve_ticker`/
`fetch_holding_extra_info`, tous deux basés sur `yf.Search`). Une crypto ne doit
plus jamais déclencher de recherche Yahoo Finance pour son émetteur/résumé — ces
deux champs n'ont pas de sens pour une cryptomonnaie dans ce modèle de données et
restent `None`."""

from app.services import holding_detail_service, market_data_service

from .conftest import ID_UTILISATEUR_TEST, make_holding


def test_crypto_naffiche_jamais_demetteur_ni_de_resume(db, monkeypatch):
    def _resolve_interdit(*args, **kwargs):
        raise AssertionError("resolve_ticker (yfinance) ne doit jamais être appelé pour une CRYPTO")

    def _extra_interdit(*args, **kwargs):
        raise AssertionError("fetch_holding_extra_info (yfinance) ne doit jamais être appelé pour une CRYPTO")

    monkeypatch.setattr(market_data_service, "resolve_ticker", _resolve_interdit)
    monkeypatch.setattr(market_data_service, "fetch_holding_extra_info", _extra_interdit)

    holding = make_holding(db, ticker="PKN", nom=None, type_actif="CRYPTO", quantite=100.0, prix_revient_moyen=0.4)

    detail = holding_detail_service.build_holding_detail(db, holding.id, ID_UTILISATEUR_TEST)

    assert detail is not None
    assert detail["emetteur"] is None
    assert detail["resume"] is None


def test_stock_continue_dappeler_resolve_ticker_et_extra_info(db, monkeypatch):
    """Non-régression : le comportement pour une action (déjà en place) n'est pas
    modifié par cette exclusion, spécifique à CRYPTO."""
    appels: list[str] = []

    def _resolve(db_arg, identifiant, asset_class):
        appels.append("resolve")
        return "AAPL"

    def _extra(ticker_resolu, asset_class):
        appels.append("extra")
        return {"emetteur": None, "resume": "Résumé Apple", "frais_gestion_pct": None}

    monkeypatch.setattr(market_data_service, "resolve_ticker", _resolve)
    monkeypatch.setattr(market_data_service, "fetch_holding_extra_info", _extra)

    holding = make_holding(db, ticker="AAPL", nom="Apple Inc", type_actif="STOCK")

    detail = holding_detail_service.build_holding_detail(db, holding.id, ID_UTILISATEUR_TEST)

    assert detail is not None
    assert detail["resume"] == "Résumé Apple"
    assert appels == ["resolve", "extra"]
