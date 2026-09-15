"""Verrouille le comportement de `fetch_fund_composition` — en particulier la
normalisation des poids (1.6) et le repli sur le nom de l'indice quand Yahoo ne
fournit pas `top_holdings` (2.1) —, sans aucun appel réseau (double `yf.Ticker` posé
par `no_network_yfinance` dans `conftest.py`). Verrouille aussi la limitation des
appels vers Yahoo Finance (LOT 7.5) : temporisation entre deux identifiants d'un
même rafraîchissement, et délai minimal entre deux rafraîchissements manuels."""

from datetime import datetime

import pytest
import yfinance as yf

from app.models import (
    SOURCE_COMPOSITION,
    SOURCE_INDICE,
    SOURCE_JUSTETF,
    FundComposition,
    FundTopHolding,
    MarketDataCache,
    TickerResolution,
)
from app.services import market_data_refresh, market_data_service
from app.services.market_data_service import fetch_fund_composition

from .conftest import attendre_fin_rafraichissement_arriere_plan, make_holding


class FauxFundsData:
    """Double contrôlable pour `yf.Ticker(...).funds_data`."""

    def __init__(self, sector_weightings=None, top_holdings=None):
        self.sector_weightings = sector_weightings or {}
        self.top_holdings = top_holdings


def test_poids_sectoriels_normalises_a_1(monkeypatch):
    """Sur les données réelles, la somme des poids sectoriels Yahoo peut légèrement
    dépasser 1 (observé : 1,0001). Comme pour la répartition géographique, on
    renormalise pour que la somme des poids affichés vaille exactement 1,0."""

    class FauxTickerAvecFonds:
        def __init__(self, symbole, *args, **kwargs):
            self.symbole = symbole
            self.funds_data = FauxFundsData(
                sector_weightings={
                    "technology": 0.50,
                    "financial_services": 0.30,
                    "healthcare": 0.25,
                },
                top_holdings=None,
            )

    monkeypatch.setattr(yf, "Ticker", FauxTickerAvecFonds)

    geo_rows, sector_rows, top_holdings_detail = fetch_fund_composition("FAKE.ETF", {})

    total_poids = sum(row["poids"] for row in sector_rows)
    assert total_poids == pytest.approx(1.0, abs=1e-9)
    assert len(sector_rows) == 3
    assert top_holdings_detail == []
    assert geo_rows == []


def test_poids_sectoriels_vides_ne_plantent_pas(monkeypatch):
    class FauxTickerSansDonnees:
        def __init__(self, symbole, *args, **kwargs):
            self.symbole = symbole
            self.funds_data = FauxFundsData(sector_weightings={}, top_holdings=None)

    monkeypatch.setattr(yf, "Ticker", FauxTickerSansDonnees)

    geo_rows, sector_rows, top_holdings_detail = fetch_fund_composition("FAKE.ETF", {})

    assert sector_rows == []


def test_fonds_sans_top_holdings_replie_sur_le_nom_de_lindice(monkeypatch):
    """Sur les données réelles, la majorité des ETF détenus n'ont pas de
    `top_holdings` renseigné par Yahoo (2.1) : sans repli, ils basculaient
    entièrement en "Non catégorisé". Un fonds dont le nom contient un indice
    reconnu (ici MSCI World) obtient désormais une répartition géographique
    de source "indice"."""

    class FauxTickerSansTopHoldings:
        def __init__(self, symbole, *args, **kwargs):
            self.symbole = symbole
            self.funds_data = FauxFundsData(sector_weightings={}, top_holdings=None)

    monkeypatch.setattr(yf, "Ticker", FauxTickerSansTopHoldings)

    geo_rows, sector_rows, top_holdings_detail = fetch_fund_composition(
        "FAKE.ETF", {}, nom_fonds="iShares Core MSCI World UCITS ETF"
    )

    assert geo_rows != []
    assert all(row["source"] == SOURCE_INDICE for row in geo_rows)
    assert sum(row["poids"] for row in geo_rows) == pytest.approx(1.0, abs=1e-9)
    assert top_holdings_detail == []


def test_fonds_avec_top_holdings_garde_la_source_composition(monkeypatch):
    """Quand Yahoo fournit `top_holdings`, la répartition géographique vient de la
    composition réelle du fonds — le repli sur le nom de l'indice ne doit pas
    s'appliquer, même si le nom du fonds contient par ailleurs un indice reconnu."""
    import pandas as pd

    class FauxTickerAvecTopHoldings:
        def __init__(self, symbole, *args, **kwargs):
            self.symbole = symbole
            if symbole == "FAKE.ETF":
                top_holdings = pd.DataFrame(
                    {"Holding Percent": [0.6, 0.4], "Name": ["Titre A", "Titre B"]},
                    index=["AAA", "BBB"],
                )
                self.funds_data = FauxFundsData(sector_weightings={}, top_holdings=top_holdings)
                self.info = {}
            else:
                self.funds_data = None
                self.info = {"country": "France", "sector": "Technology"}

    monkeypatch.setattr(yf, "Ticker", FauxTickerAvecTopHoldings)

    geo_rows, sector_rows, top_holdings_detail = fetch_fund_composition(
        "FAKE.ETF", {}, nom_fonds="iShares Core MSCI World UCITS ETF"
    )

    assert geo_rows != []
    assert all(row["source"] == SOURCE_COMPOSITION for row in geo_rows)
    assert len(top_holdings_detail) == 2


def test_fonds_ni_top_holdings_ni_indice_reconnu_naboutit_a_aucune_ligne(monkeypatch):
    class FauxTickerSansRien:
        def __init__(self, symbole, *args, **kwargs):
            self.symbole = symbole
            self.funds_data = FauxFundsData(sector_weightings={}, top_holdings=None)

    monkeypatch.setattr(yf, "Ticker", FauxTickerSansRien)

    geo_rows, sector_rows, top_holdings_detail = fetch_fund_composition(
        "FAKE.ETF", {}, nom_fonds="Obligation Trésor Français 2032"
    )

    assert geo_rows == []
    assert sector_rows == []
    assert top_holdings_detail == []


# ---------------------------------------------------------------------------
# 7.5 — limitation des appels vers Yahoo Finance
# ---------------------------------------------------------------------------


def test_delai_entre_appels_neutralise_sous_test():
    """`backend/conftest.py` pose `PATRIMOINE_TESTING` avant tout import de
    l'application : le module doit avoir lu cette variable à l'import et neutralisé
    la temporisation, sans quoi toute la suite de tests serait ralentie."""
    assert market_data_service.DELAI_ENTRE_APPELS_SECONDES == 0.0


def test_refresh_tickers_temporise_entre_deux_identifiants(db, monkeypatch):
    appels_sleep = []
    monkeypatch.setattr(market_data_service, "DELAI_ENTRE_APPELS_SECONDES", 0.5)
    monkeypatch.setattr(market_data_service.time, "sleep", lambda s: appels_sleep.append(s))

    market_data_service.refresh_tickers(db, [("AAA", "STOCK"), ("BBB", "STOCK"), ("CCC", "STOCK")])

    # Une temporisation entre chaque paire d'identifiants consécutifs, jamais avant
    # le premier (rien à espacer avant qu'un premier appel n'ait eu lieu).
    assert appels_sleep == [0.5, 0.5]


def test_refresh_tickers_ne_temporise_pas_si_delai_nul(db, monkeypatch):
    appels_sleep = []
    monkeypatch.setattr(market_data_service, "DELAI_ENTRE_APPELS_SECONDES", 0.0)
    monkeypatch.setattr(market_data_service.time, "sleep", lambda s: appels_sleep.append(s))

    market_data_service.refresh_tickers(db, [("AAA", "STOCK"), ("BBB", "STOCK")])

    assert appels_sleep == []


def test_refresh_tickers_saute_le_patrimoine_valorise_manuellement(db, monkeypatch):
    """Phase 1 de `docs/ROADMAP.md` : immobilier/SCPI/assurance-vie/PER n'ont pas de
    ticker coté — ni `resolve_ticker` (yfinance) ni justETF ne doivent être sollicités,
    et aucune `MarketDataCache` ne doit être créée pour ces lignes."""
    appels_resolve = []
    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db, identifiant, asset_class: appels_resolve.append(identifiant) or None)

    resultats = market_data_service.refresh_tickers(
        db, [("MAISON", "REAL_ESTATE"), ("AV1", "LIFE_INSURANCE"), ("AAA", "STOCK")]
    )

    assert appels_resolve == ["AAA"]
    assert db.get(MarketDataCache, "MAISON") is None
    assert db.get(MarketDataCache, "AV1") is None
    # La ligne financière, elle, est bien traitée normalement.
    assert any(r.get("ticker") == "AAA" for r in resultats)


def test_refresh_manuel_second_appel_immediat_refuse_en_429(client, db):
    make_holding(db, ticker="AAA", quantite=1.0)

    premier = client.post("/api/market-data/refresh")
    assert premier.status_code == 202
    attendre_fin_rafraichissement_arriere_plan()

    second = client.post("/api/market-data/refresh")
    assert second.status_code == 429
    assert "patienter" in second.json()["detail"].lower()


def test_refresh_manuel_appel_unique_accepte(client, db):
    make_holding(db, ticker="AAA", quantite=1.0)

    reponse = client.post("/api/market-data/refresh")
    assert reponse.status_code == 202
    # 4B — la réponse est désormais l'état de démarrage du rafraîchissement en
    # tâche de fond, plus la liste complète du cache (le frontend rappelle de toute
    # façon `listHoldings()` juste après).
    corps = reponse.json()
    assert corps["en_cours"] is True
    assert corps["positions_total"] == 1


def test_refresh_manuel_delai_ecoule_de_nouveau_accepte(client, db, monkeypatch):
    """Passé le délai minimal, un nouveau rafraîchissement manuel est de nouveau
    accepté (pas de blocage permanent après le premier)."""
    from datetime import timedelta

    make_holding(db, ticker="AAA", quantite=1.0)

    premier = client.post("/api/market-data/refresh")
    assert premier.status_code == 202
    # Attend la fin effective du premier rafraîchissement avant d'en déclencher un
    # second : sans ça, le second pourrait essuyer un 409 (déjà en cours) au lieu du
    # 202 attendu ici, selon que le fil de fond a eu le temps de se terminer.
    attendre_fin_rafraichissement_arriere_plan()

    # Fait "avancer le temps" en reculant artificiellement la référence enregistrée,
    # plutôt que d'attendre réellement `DELAI_MINIMAL_ENTRE_RAFRAICHISSEMENTS_SECONDES`.
    monkeypatch.setattr(
        market_data_refresh,
        "_dernier_rafraichissement_manuel",
        market_data_refresh._dernier_rafraichissement_manuel
        - timedelta(seconds=market_data_refresh.DELAI_MINIMAL_ENTRE_RAFRAICHISSEMENTS_SECONDES + 1),
    )

    second = client.post("/api/market-data/refresh")
    assert second.status_code == 202


# ---------------------------------------------------------------------------
# 2.4 — une composition justETF déjà en base n'est jamais écrasée par ce
# rafraîchissement (cadence bien plus fréquente que le job justETF dédié)
# ---------------------------------------------------------------------------


def test_refresh_tickers_ne_recalcule_pas_si_composition_justetf_deja_presente(db, monkeypatch):
    """Une ligne `FundComposition` `source=SOURCE_JUSTETF` déjà en base pour un
    ticker doit rester intacte : `refresh_tickers` ne doit ni la supprimer, ni la
    dupliquer, ni la remplacer par un recalcul yfinance — même si yfinance
    produirait ici une composition différente."""
    make_holding(db, ticker="IE00JUSTETF", type_actif="FUND")
    db.add(FundComposition(ticker="IE00JUSTETF", type="geo", categorie="Europe", poids=1.0, source=SOURCE_JUSTETF))
    db.commit()

    class FauxTickerAvecCompositionDifferente:
        def __init__(self, symbole, *args, **kwargs):
            self.symbole = symbole
            self.info = {
                "regularMarketPrice": 100.0,
                "currency": "EUR",
                "country": "France",
                "sector": "Technology",
            }
            self.funds_data = FauxFundsData(sector_weightings={"technology": 1.0}, top_holdings=None)

    monkeypatch.setattr(yf, "Ticker", FauxTickerAvecCompositionDifferente)
    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db, identifiant, asset_class: "FAKE.ETF")

    market_data_service.refresh_tickers(db, [("IE00JUSTETF", "FUND")])

    lignes = db.query(FundComposition).filter(FundComposition.ticker == "IE00JUSTETF").all()
    assert len(lignes) == 1
    assert lignes[0].source == SOURCE_JUSTETF
    assert lignes[0].categorie == "Europe"


def test_refresh_tickers_preserve_fund_top_holding_si_composition_justetf(db, monkeypatch):
    """`FundTopHolding` (détail nominatif) est peuplé par le même bloc que
    `FundComposition` côté yfinance : sauter ce bloc pour un ticker géré par
    justETF ne doit pas non plus vider `FundTopHolding` sans jamais le
    reconstruire — la ligne déjà en base doit survivre à l'identique."""
    make_holding(db, ticker="IE00JUSTETF", type_actif="FUND")
    db.add(FundComposition(ticker="IE00JUSTETF", type="geo", categorie="Europe", poids=1.0, source=SOURCE_JUSTETF))
    db.add(FundTopHolding(ticker="IE00JUSTETF", holding_symbol="ASML.AS", holding_nom="ASML", poids=0.1))
    db.commit()

    class FauxTickerAvecCompositionDifferente:
        def __init__(self, symbole, *args, **kwargs):
            self.symbole = symbole
            self.info = {
                "regularMarketPrice": 100.0,
                "currency": "EUR",
                "country": "France",
                "sector": "Technology",
            }
            self.funds_data = FauxFundsData(sector_weightings={"technology": 1.0}, top_holdings=None)

    monkeypatch.setattr(yf, "Ticker", FauxTickerAvecCompositionDifferente)
    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db, identifiant, asset_class: "FAKE.ETF")

    market_data_service.refresh_tickers(db, [("IE00JUSTETF", "FUND")])

    lignes = db.query(FundTopHolding).filter(FundTopHolding.ticker == "IE00JUSTETF").all()
    assert len(lignes) == 1
    assert lignes[0].holding_symbol == "ASML.AS"


# ---------------------------------------------------------------------------
# 2.4 / Increment 9 — cours de référence des ETF via justETF (pas yfinance,
# sans repli en cas d'échec — décision utilisateur explicite)
# ---------------------------------------------------------------------------


def test_refresh_tickers_fund_utilise_justetf_pas_yfinance_pour_le_prix(db, monkeypatch):
    """Le prix de référence d'un ETF vient désormais de `justetf_service.fetch_price`
    (déjà en EUR) — `fetch_one` (yfinance) ne doit plus jamais être sollicité pour
    la cotation d'un `FUND`, même en cas de succès."""

    def _fetch_one_interdit(*args, **kwargs):
        raise AssertionError("fetch_one (yfinance) ne doit jamais être appelé pour un FUND")

    monkeypatch.setattr(market_data_service, "fetch_one", _fetch_one_interdit)
    monkeypatch.setattr(market_data_service.justetf_service, "fetch_price", lambda isin: {"prix_actuel": 127.09})

    resultats = market_data_service.refresh_tickers(db, [("IE00B4L5Y983", "FUND")])

    assert resultats == [{"ticker": "IE00B4L5Y983", "prix_actuel": pytest.approx(127.09), "devise": "EUR", "erreur": None}]
    cache = db.get(MarketDataCache, "IE00B4L5Y983")
    assert cache is not None
    assert cache.prix_actuel == pytest.approx(127.09)
    assert cache.devise == "EUR"
    assert cache.erreur is None


def test_refresh_tickers_fund_echec_justetf_aucun_repli_yfinance(db, monkeypatch):
    """Décision utilisateur explicite (2.4) : un échec justETF affiche « cotation
    indisponible », sans jamais retomber sur yfinance."""

    def _fetch_one_interdit(*args, **kwargs):
        raise AssertionError("fetch_one (yfinance) ne doit jamais être appelé, même après un échec justETF")

    monkeypatch.setattr(market_data_service, "fetch_one", _fetch_one_interdit)
    monkeypatch.setattr(market_data_service.justetf_service, "fetch_price", lambda isin: None)

    resultats = market_data_service.refresh_tickers(db, [("IE00B4L5Y983", "FUND")])

    assert resultats == [{"ticker": "IE00B4L5Y983", "erreur": "Cotation indisponible (justETF)"}]
    cache = db.get(MarketDataCache, "IE00B4L5Y983")
    assert cache is not None
    assert cache.erreur == "Cotation indisponible (justETF)"
    assert cache.prix_actuel is None


def test_refresh_tickers_stock_ignore_justetf_et_coinmarketcap(db, monkeypatch):
    """Comportement `STOCK` inchangé : toujours `fetch_one` (yfinance), ni
    `justetf_service.fetch_price` ni `coinmarketcap_service.fetch_price` ne
    doivent être sollicités pour lui."""

    def _fetch_price_interdit(*args, **kwargs):
        raise AssertionError("aucune des deux sources dédiées ne doit être appelée pour un STOCK")

    monkeypatch.setattr(market_data_service.justetf_service, "fetch_price", _fetch_price_interdit)
    monkeypatch.setattr(market_data_service.coinmarketcap_service, "fetch_price", _fetch_price_interdit)

    resultats = market_data_service.refresh_tickers(db, [("AAPL", "STOCK")])

    assert resultats == [{"ticker": "AAPL", "erreur": "Cotation indisponible (titre non coté ou non reconnu)"}]


def test_refresh_tickers_crypto_ignore_justetf(db, monkeypatch):
    """Symétrique : `justetf_service.fetch_price` ne doit jamais être sollicité
    pour une CRYPTO (15/09/2026, cf. `coinmarketcap_service`) — comportement déjà
    verrouillé côté « pas de yfinance » par les tests du bloc dédié plus bas."""

    def _fetch_price_interdit(*args, **kwargs):
        raise AssertionError("justetf_service.fetch_price ne doit être appelé que pour asset_class == 'FUND'")

    monkeypatch.setattr(market_data_service.justetf_service, "fetch_price", _fetch_price_interdit)
    monkeypatch.setattr(market_data_service.coinmarketcap_service, "fetch_price", lambda symbol: None)

    resultats = market_data_service.refresh_tickers(db, [("BTC", "CRYPTO")])

    assert resultats == [{"ticker": "BTC", "erreur": "Cotation indisponible (CoinMarketCap)"}]


def test_refresh_tickers_temporise_aussi_entre_deux_appels_justetf(db, monkeypatch):
    """Garde-fou de débit dédié (2.4) : `justetf_service.DELAI_ENTRE_APPELS_JUSTETF_SECONDES`,
    indépendant de `DELAI_ENTRE_APPELS_SECONDES` (yfinance) — jamais de temporisation
    avant le tout premier appel justETF, comme pour le garde-fou yfinance existant."""
    monkeypatch.setattr(market_data_service, "DELAI_ENTRE_APPELS_SECONDES", 0.0)
    monkeypatch.setattr(market_data_service.justetf_service, "DELAI_ENTRE_APPELS_JUSTETF_SECONDES", 3.0)
    monkeypatch.setattr(market_data_service.justetf_service, "fetch_price", lambda isin: None)

    appels_sleep = []
    monkeypatch.setattr(market_data_service.time, "sleep", lambda s: appels_sleep.append(s))

    market_data_service.refresh_tickers(db, [("AAA", "FUND"), ("BBB", "FUND"), ("CCC", "FUND")])

    assert appels_sleep == [3.0, 3.0]


# ---------------------------------------------------------------------------
# Roadmap Phase 3, § E.3 — coût de gestion consolidé : TER mis en cache une
# seule fois par ticker FUND, jamais recalculé aux rafraîchissements suivants.
# ---------------------------------------------------------------------------


def test_fetch_frais_gestion_lit_net_expense_ratio(monkeypatch):
    class FauxTickerAvecTer:
        def __init__(self, symbole, *args, **kwargs):
            self.info = {"netExpenseRatio": 0.2}

    monkeypatch.setattr(yf, "Ticker", FauxTickerAvecTer)

    assert market_data_service.fetch_frais_gestion("FAKE.ETF") == 0.2


def test_fetch_frais_gestion_none_si_absent_ou_erreur(monkeypatch):
    class FauxTickerSansInfo:
        def __init__(self, symbole, *args, **kwargs):
            self.info = {}

    monkeypatch.setattr(yf, "Ticker", FauxTickerSansInfo)
    assert market_data_service.fetch_frais_gestion("FAKE.ETF") is None

    def _leve(*args, **kwargs):
        raise ConnectionError("réseau indisponible")

    monkeypatch.setattr(yf, "Ticker", _leve)
    assert market_data_service.fetch_frais_gestion("FAKE.ETF") is None


def test_refresh_tickers_fund_met_en_cache_le_ter_au_premier_rafraichissement(db, monkeypatch):
    make_holding(db, ticker="IE00TER", type_actif="FUND")
    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db, identifiant, asset_class: "FAKE.ETF")
    monkeypatch.setattr(market_data_service.justetf_service, "fetch_price", lambda isin: {"prix_actuel": 100.0})
    monkeypatch.setattr(market_data_service, "fetch_frais_gestion", lambda ticker_resolu: 0.22)

    market_data_service.refresh_tickers(db, [("IE00TER", "FUND")])

    cache = db.get(MarketDataCache, "IE00TER")
    assert cache.frais_gestion_pct == 0.22


def test_refresh_tickers_fund_ne_recalcule_plus_le_ter_une_fois_connu(db, monkeypatch):
    """Une fois `frais_gestion_pct` renseigné, les rafraîchissements suivants ne
    doivent plus jamais rappeler `fetch_frais_gestion` — c'est tout le sens du
    cache « une seule fois par ticker » (§ E.3)."""
    make_holding(db, ticker="IE00TER", type_actif="FUND")
    db.add(MarketDataCache(ticker="IE00TER", frais_gestion_pct=0.10))
    db.commit()

    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db, identifiant, asset_class: "FAKE.ETF")
    monkeypatch.setattr(market_data_service.justetf_service, "fetch_price", lambda isin: {"prix_actuel": 100.0})

    def _interdit(*args, **kwargs):
        raise AssertionError("fetch_frais_gestion ne doit plus être appelé une fois le TER déjà connu")

    monkeypatch.setattr(market_data_service, "fetch_frais_gestion", _interdit)

    market_data_service.refresh_tickers(db, [("IE00TER", "FUND")])

    cache = db.get(MarketDataCache, "IE00TER")
    assert cache.frais_gestion_pct == 0.10  # inchangé


# --- Composition : justETF d'abord, yfinance en repli (03/09/2026) ---------------


def _fiche_justetf(geo=None, secteurs=None, top=None):
    from app.services.justetf_service import FicheJustETF

    return FicheJustETF(
        geo_rows=geo or [],
        sector_rows=secteurs or [],
        geo_brut=[],
        sector_brut=[],
        description=None,
        top_holdings=top or [],
    )


def test_un_etf_couvert_par_justetf_obtient_sa_repartition_geographique_des_le_premier_rafraichissement(db, monkeypatch):
    """Signalé le 03/09/2026 sur FR0011550185, un S&P 500 pourtant parfaitement
    couvert par justETF : après ajout, la répartition SECTORIELLE apparaissait —
    yfinance la fournit — mais pas la GÉOGRAPHIQUE, que yfinance ne donne pas pour
    beaucoup d'ETF européens. Elle n'arrivait qu'avec le job justETF, HEBDOMADAIRE :
    jusqu'à sept jours d'écran incomplet, sans que rien n'indique qu'il fallait
    attendre.

    L'ordre « justETF d'abord, yfinance en repli » était pourtant déjà documenté —
    il n'était appliqué qu'au prix, jamais à la composition."""
    from app.services import justetf_service

    make_holding(db, ticker="FR0011550185", type_actif="FUND")
    monkeypatch.setattr(justetf_service, "fetch_price", lambda isin: {"prix_actuel": 33.5, "devise": "EUR"})
    monkeypatch.setattr(
        justetf_service,
        "fetch_composition",
        lambda isin: _fiche_justetf(
            geo=[{"categorie": "Amérique du Nord", "poids": 0.97}, {"categorie": "Europe", "poids": 0.03}],
            secteurs=[{"categorie": "Technologies de l'information", "poids": 1.0}],
            top=[{"nom": "Apple", "poids": 0.07}],
        ),
    )

    market_data_service.refresh_tickers(db, [("FR0011550185", "FUND")])

    zones = db.query(FundComposition).filter(FundComposition.ticker == "FR0011550185", FundComposition.type == "geo").all()
    assert [z.categorie for z in zones] == ["Amérique du Nord", "Europe"]
    assert {z.source for z in zones} == {SOURCE_JUSTETF}
    # Le top 10 nominatif suit le même chemin.
    assert db.query(FundTopHolding).filter(FundTopHolding.ticker == "FR0011550185").count() == 1


def test_un_etf_non_couvert_par_justetf_retombe_sur_yfinance(db, monkeypatch):
    """L'autre moitié du contrat, et la plus facile à casser en corrigeant la
    première : justETF ne couvre pas tout (ETF obligataires, matières premières,
    ETC) et rend alors des listes vides. Sans ce test, un correctif qui ferait
    confiance à justETF sans vérifier priverait ces ETF de TOUTE composition."""
    from app.services import justetf_service

    make_holding(db, ticker="LU0000000000", type_actif="FUND")
    monkeypatch.setattr(justetf_service, "fetch_price", lambda isin: {"prix_actuel": 10.0, "devise": "EUR"})
    # Couverture absente : fiche vide sur les deux axes de composition.
    monkeypatch.setattr(justetf_service, "fetch_composition", lambda isin: _fiche_justetf())
    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db_, isin, ac: "XXX.PA")
    monkeypatch.setattr(
        market_data_service,
        "fetch_fund_composition",
        lambda ticker, cache, nom=None: ([], [{"categorie": "Finance", "poids": 1.0, "source": SOURCE_COMPOSITION}], []),
    )

    market_data_service.refresh_tickers(db, [("LU0000000000", "FUND")])

    lignes = db.query(FundComposition).filter(FundComposition.ticker == "LU0000000000").all()
    assert [l.categorie for l in lignes] == ["Finance"]
    assert {l.source for l in lignes} == {SOURCE_COMPOSITION}


def test_justetf_injoignable_ne_prive_pas_l_etf_de_composition(db, monkeypatch):
    """`fetch_composition` rend `None` sur échec réseau ou parsing. Le repli doit
    jouer là aussi, sinon une indisponibilité passagère de justETF viderait la
    composition de tous les ETF au prochain rafraîchissement de prix."""
    from app.services import justetf_service

    make_holding(db, ticker="LU1111111111", type_actif="FUND")
    monkeypatch.setattr(justetf_service, "fetch_price", lambda isin: {"prix_actuel": 10.0, "devise": "EUR"})
    monkeypatch.setattr(justetf_service, "fetch_composition", lambda isin: None)
    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db_, isin, ac: "YYY.PA")
    monkeypatch.setattr(
        market_data_service,
        "fetch_fund_composition",
        lambda ticker, cache, nom=None: ([{"categorie": "Europe", "poids": 1.0, "source": SOURCE_INDICE}], [], []),
    )

    market_data_service.refresh_tickers(db, [("LU1111111111", "FUND")])

    lignes = db.query(FundComposition).filter(FundComposition.ticker == "LU1111111111").all()
    assert [l.categorie for l in lignes] == ["Europe"]


def test_le_repli_par_nom_d_indice_fonctionne_a_nouveau_pour_un_fonds(db, monkeypatch):
    """Signalé le 03/09/2026 sur FR0011871078 (ETF Chine à réplication synthétique,
    sans onglet Holdings sur justETF donc sans AUCUNE composition côté justETF, ni
    top_holdings côté Yahoo) : la ligne restait « Non catégorisée » en géographie
    alors que le repli par nom d'indice (`repartition_geo_depuis_le_nom`) est censé
    couvrir précisément ce cas.

    Cause : `data.get("nom")`, transmis en repli, vaut TOUJOURS `None` pour un FUND
    depuis que son prix vient de `justetf_service.fetch_price` (Increment 9, 2.4) —
    qui ne renvoie qu'un prix, jamais un nom. Le repli par nom d'indice était donc
    mort pour tout fonds depuis ce changement, sans qu'aucun test ne l'ait détecté :
    les tests existants appellent `fetch_fund_composition` directement, en lui
    passant un nom à la main, jamais via le chemin réel de `refresh_tickers`."""
    from app.services import justetf_service

    make_holding(db, ticker="FR0011871078", nom="PEA HSCEI China EUR (Acc)", type_actif="FUND")
    monkeypatch.setattr(justetf_service, "fetch_price", lambda isin: {"prix_actuel": 9.8})
    # justETF sans aucune couverture (fonds synthétique) : geo_rows ET sector_rows vides.
    monkeypatch.setattr(justetf_service, "fetch_composition", lambda isin: _fiche_justetf())
    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db_, isin, ac: "PASI.PA")

    market_data_service.refresh_tickers(db, [("FR0011871078", "FUND")])

    geo = db.query(FundComposition).filter(FundComposition.ticker == "FR0011871078", FundComposition.type == "geo").all()
    assert [g.categorie for g in geo] == ["Marchés émergents"]
    assert {g.source for g in geo} == {SOURCE_INDICE}


def test_un_etf_non_couvert_par_justetf_n_est_recontacte_qu_une_fois(db, monkeypatch):
    """Suite du correctif ci-dessus, trouvée en le vérifiant : `a_deja_composition_justetf`
    (qui borne l'appel à justETF) ne devient JAMAIS vraie pour un ETF que justETF ne
    couvre pas — un fonds synthétique n'obtient jamais de ligne `source=justetf`.
    Sans le second correctif verrouillé ici, un tel ETF se ferait interroger sur
    justETF à CHAQUE rafraîchissement de prix (quotidien par défaut, plus souvent via
    le bouton manuel) au lieu d'une seule fois — au mépris de la politesse due à une
    ressource « sans SLA ni support » (cf. docstring de module).

    Seul le job hebdomadaire dédié (`justetf_service.refresh_all`) doit revérifier
    périodiquement si justETF a fini par couvrir un tel ETF."""
    from app.services import justetf_service

    make_holding(db, ticker="FR0011871078", nom="PEA HSCEI China EUR (Acc)", type_actif="FUND")
    monkeypatch.setattr(justetf_service, "fetch_price", lambda isin: {"prix_actuel": 9.8})
    appels_justetf = []
    monkeypatch.setattr(
        justetf_service,
        "fetch_composition",
        lambda isin: appels_justetf.append(isin) or _fiche_justetf(),
    )
    monkeypatch.setattr(market_data_service, "resolve_ticker", lambda db_, isin, ac: "PASI.PA")

    market_data_service.refresh_tickers(db, [("FR0011871078", "FUND")])
    assert len(appels_justetf) == 1, "premier rafraîchissement : justETF doit être tenté"

    market_data_service.refresh_tickers(db, [("FR0011871078", "FUND")])
    assert len(appels_justetf) == 1, "second rafraîchissement : justETF ne doit PAS être retenté"

    # La composition (sector via yfinance, geo via repli nom d'indice) reste bien
    # recalculée à chaque fois — seul l'appel réseau à justETF est évité.
    lignes = db.query(FundComposition).filter(FundComposition.ticker == "FR0011871078").all()
    assert lignes, "la composition doit rester présente après le second rafraîchissement"


def test_resolution_concurrente_ne_leve_pas(db, monkeypatch):
    """Course entre deux requêtes qui résolvent le MÊME identifiant (correction du
    07/09/2026).

    Le tableau de bord lance plusieurs endpoints en parallèle et chacun résout les
    tickers dont il a besoin. Quand deux d'entre eux tombent sur un identifiant non
    encore mis en cache, tous deux insèrent la même clé primaire : la seconde
    insertion violait la contrainte d'unicité et faisait remonter un 500 jusqu'au
    navigateur (« Une erreur interne est survenue côté serveur » à la place de la
    courbe), alors que la résolution avait bel et bien abouti.

    On simule la gagnante en écrivant la ligne juste avant que la perdante ne
    commite : le service doit alors relire la valeur gagnante, sans lever."""
    from sqlalchemy.orm import Session as SessionSQLA

    from app.models import TickerResolution

    monkeypatch.setattr(market_data_service.yf, "Search", lambda *a, **k: _FauxSearch("PERDANTE.PA"))

    commit_original = SessionSQLA.commit
    deja_double = {"fait": False}

    def commit_avec_concurrente(self):
        # Écrit la ligne « gagnante » depuis une session distincte, juste avant que
        # la nôtre ne commite — exactement la fenêtre de la course réelle.
        if not deja_double["fait"]:
            deja_double["fait"] = True
            autre = SessionSQLA(bind=self.get_bind())
            autre.add(TickerResolution(identifiant="LU0000000001", ticker_resolu="GAGNANTE.PA", quote_type="ETF"))
            commit_original(autre)
            autre.close()
        return commit_original(self)

    monkeypatch.setattr(SessionSQLA, "commit", commit_avec_concurrente)

    resolu = market_data_service.resolve_ticker(db, "LU0000000001", "FUND")

    assert resolu == "GAGNANTE.PA", "la ligne écrite par la requête gagnante fait autorité"
    lignes = db.query(TickerResolution).filter(TickerResolution.identifiant == "LU0000000001").all()
    assert len(lignes) == 1, "une seule ligne en base, pas de doublon"


class _FauxSearch:
    """Double de `yf.Search` : renvoie un unique résultat exploitable."""

    def __init__(self, symbol):
        self.quotes = [{"symbol": symbol, "quoteType": "ETF"}]


class _FauxSearchVide:
    """`yf.Search` qui ne trouve rien — l'échec ORDINAIRE, celui qu'il faut
    continuer de réessayer."""

    def __init__(self, *args, **kwargs):
        self.quotes = []


# ---------------------------------------------------------------------------
# Backlog § AB.4 — un symbole qui ne peut PAS être coté ne doit jamais partir en
# recherche chez Yahoo, et son échec ne doit pas être réessayé tous les jours.
# Sur le foyer réel, l'import Bricks.co crée ≈ 145 symboles de ce genre : autant de
# recherches quotidiennes dont l'issue est connue par construction.
# ---------------------------------------------------------------------------


def test_symbole_interne_de_lapplication_nest_jamais_cherche(db, monkeypatch):
    def _search_interdit(*args, **kwargs):
        raise AssertionError("aucune recherche réseau ne doit avoir lieu pour un symbole interne")

    monkeypatch.setattr(market_data_service.yf, "Search", _search_interdit)

    assert market_data_service.resolve_ticker(db, "BRICKS-3A4B5C6D7E", "BOND") is None

    cached = db.get(TickerResolution, "BRICKS-3A4B5C6D7E")
    assert cached.echec_structurel is True


def test_actif_valorise_a_la_main_nest_jamais_cherche(db, monkeypatch):
    def _search_interdit(*args, **kwargs):
        raise AssertionError("aucune recherche réseau ne doit avoir lieu pour un actif manuel")

    monkeypatch.setattr(market_data_service.yf, "Search", _search_interdit)

    assert market_data_service.resolve_ticker(db, "MA_MAISON", "REAL_ESTATE") is None
    assert market_data_service.resolve_ticker(db, "LIVRET_A", "REGULATED_SAVINGS") is None


def test_un_echec_structurel_nest_jamais_reessaye(db, monkeypatch):
    """La différence avec un échec ordinaire : celui-ci est réessayé chaque jour
    (`DUREE_CACHE_ECHEC_JOURS`), celui-là jamais."""
    monkeypatch.setattr(market_data_service.yf, "Search", lambda *a, **k: _FauxSearchVide())
    market_data_service.resolve_ticker(db, "BRICKS-AAAA", "BOND")

    cached = db.get(TickerResolution, "BRICKS-AAAA")
    cached.resolue_le = datetime(2020, 1, 1)  # très ancien : un échec ordinaire repartirait
    db.commit()

    def _search_interdit(*args, **kwargs):
        raise AssertionError("un échec structurel ne doit jamais être réessayé")

    monkeypatch.setattr(market_data_service.yf, "Search", _search_interdit)
    assert market_data_service.resolve_ticker(db, "BRICKS-AAAA", "BOND") is None


def test_un_echec_ordinaire_reste_reessaye(db, monkeypatch):
    """Non-régression : un vrai titre que Yahoo n'a pas trouvé aujourd'hui (panne,
    titre fraîchement coté) doit continuer d'être réessayé — c'est tout l'objet de
    `DUREE_CACHE_ECHEC_JOURS`, que ce lot ne remet pas en cause."""
    monkeypatch.setattr(market_data_service.yf, "Search", lambda *a, **k: _FauxSearchVide())
    market_data_service.resolve_ticker(db, "FR0000000000", "STOCK")

    cached = db.get(TickerResolution, "FR0000000000")
    assert cached.echec_structurel is False
    cached.resolue_le = datetime(2020, 1, 1)
    db.commit()

    appels = {"n": 0}

    class _SearchCompte:
        def __init__(self, *args, **kwargs):
            appels["n"] += 1
            self.quotes = []

    monkeypatch.setattr(market_data_service.yf, "Search", _SearchCompte)
    market_data_service.resolve_ticker(db, "FR0000000000", "STOCK")

    assert appels["n"] == 1


# ---------------------------------------------------------------------------
# 15/09/2026 — retour utilisateur : une crypto Ledger "PKN" résolvait à tort vers
# l'action polonaise Orlen S.A. (ticker Yahoo "PKN.WA") — `resolve_ticker` se
# rabattait sur le premier résultat de `yf.Search`, quel que soit son type, quand
# aucun résultat ne correspondait au type attendu. Corrigé : plus jamais de
# substitution d'une classe d'actif par une autre quand une préférence est connue
# (`QUOTE_TYPES_BY_ASSET_CLASS`). Le prix crypto vient désormais de CoinMarketCap
# (`coinmarketcap_service`), jamais de Yahoo Finance — cf. bloc suivant.
# ---------------------------------------------------------------------------


class _FauxSearchTypeNonPrefere:
    """Reproduit exactement l'incident : Yahoo ne renvoie AUCUN résultat du type
    attendu, seulement un résultat d'une tout autre nature partageant le symbole."""

    def __init__(self, *args, **kwargs):
        self.quotes = [{"symbol": "PKN.WA", "quoteType": "EQUITY", "longname": "Orlen S.A."}]


def test_resolve_ticker_ne_substitue_plus_jamais_une_classe_dactif_par_une_autre(db, monkeypatch):
    """Non-régression exacte de l'incident PKN -> Orlen S.A."""
    monkeypatch.setattr(market_data_service.yf, "Search", lambda *a, **k: _FauxSearchTypeNonPrefere())

    assert market_data_service.resolve_ticker(db, "PKN", "CRYPTO") is None

    cached = db.get(TickerResolution, "PKN")
    assert cached is not None
    assert cached.ticker_resolu is None
    assert cached.echec_structurel is False  # échec ORDINAIRE : réessayé chaque jour, pas définitif


def test_resolve_ticker_asset_class_inconnue_garde_lancien_repli(db, monkeypatch):
    """Le repli « premier résultat, quel qu'il soit » reste légitime quand on ne
    sait pas quoi chercher (`asset_class` absent de `QUOTE_TYPES_BY_ASSET_CLASS`,
    ex. une saisie manuelle sans classe déclarée) — rien à violer, aucune
    préférence n'est connue."""
    monkeypatch.setattr(market_data_service.yf, "Search", lambda *a, **k: _FauxSearchTypeNonPrefere())

    assert market_data_service.resolve_ticker(db, "PKN", None) == "PKN.WA"


# ---------------------------------------------------------------------------
# 15/09/2026 — cours de référence d'une crypto via CoinMarketCap (pas yfinance,
# sans repli en cas d'échec — même décision qu'à 2.4 pour justETF)
# ---------------------------------------------------------------------------


def test_refresh_tickers_crypto_utilise_coinmarketcap_pas_yfinance(db, monkeypatch):
    def _fetch_one_interdit(*args, **kwargs):
        raise AssertionError("fetch_one (yfinance) ne doit jamais être appelé pour une CRYPTO")

    def _search_interdit(*args, **kwargs):
        raise AssertionError("yf.Search ne doit jamais être sollicité pour résoudre une CRYPTO")

    monkeypatch.setattr(market_data_service, "fetch_one", _fetch_one_interdit)
    monkeypatch.setattr(market_data_service.yf, "Search", _search_interdit)
    monkeypatch.setattr(
        market_data_service.coinmarketcap_service, "fetch_price", lambda symbol: {"prix_actuel": 61234.56, "nom": "Bitcoin"}
    )

    resultats = market_data_service.refresh_tickers(db, [("BTC", "CRYPTO")])

    assert resultats == [
        {"ticker": "BTC", "nom": "Bitcoin", "prix_actuel": pytest.approx(61234.56), "devise": "EUR", "erreur": None}
    ]
    cache = db.get(MarketDataCache, "BTC")
    assert cache is not None
    assert cache.nom == "Bitcoin"
    assert cache.prix_actuel == pytest.approx(61234.56)
    assert cache.devise == "EUR"
    assert cache.secteur is None
    assert cache.pays is None
    assert cache.erreur is None
    # Aucune ligne de résolution Yahoo écrite : CoinMarketCap travaille directement
    # sur le symbole, sans passer par `resolve_ticker`.
    assert db.get(TickerResolution, "BTC") is None


def test_refresh_tickers_crypto_echec_coinmarketcap_aucun_repli_yfinance(db, monkeypatch):
    """Même décision qu'à 2.4 pour justETF : un échec CoinMarketCap affiche
    « cotation indisponible », sans jamais retomber sur yfinance — c'est
    précisément ce repli qui causait l'incident PKN -> Orlen S.A."""

    def _fetch_one_interdit(*args, **kwargs):
        raise AssertionError("fetch_one (yfinance) ne doit jamais être appelé, même après un échec CoinMarketCap")

    monkeypatch.setattr(market_data_service, "fetch_one", _fetch_one_interdit)
    monkeypatch.setattr(market_data_service.coinmarketcap_service, "fetch_price", lambda symbol: None)

    resultats = market_data_service.refresh_tickers(db, [("PKN", "CRYPTO")])

    assert resultats == [{"ticker": "PKN", "erreur": "Cotation indisponible (CoinMarketCap)"}]
    cache = db.get(MarketDataCache, "PKN")
    assert cache is not None
    assert cache.erreur == "Cotation indisponible (CoinMarketCap)"
    assert cache.prix_actuel is None
    assert cache.nom is None
