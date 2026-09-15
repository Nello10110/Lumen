"""Verrouille `coingecko_service.fetch_price` (15/09/2026, retour utilisateur :
une crypto Ledger "PKN" résolvait à tort vers l'action polonaise Orlen S.A. via
`yf.Search` — cf. docstring du module). Même style de tests que
`test_justetf_service.py` (`fetch_price`), la source directe dont ce module
s'inspire."""

import pytest

from app.services import coingecko_service


class _FausseReponseJSON:
    def __init__(self, status_code: int, corps):
        self.status_code = status_code
        self._corps = corps

    def json(self):
        return self._corps


def _corps_coingecko(symbol: str, name: str, prix_eur: float, market_cap_rank: int | None = 1) -> list[dict]:
    return [{"id": symbol.lower(), "symbol": symbol.lower(), "name": name, "current_price": prix_eur, "market_cap_rank": market_cap_rank}]


def test_sans_cle_api_ne_tente_aucun_appel_reseau(monkeypatch):
    monkeypatch.delenv("PATRIMOINE_COINGECKO_API_KEY", raising=False)

    def _appel_interdit(*args, **kwargs):
        raise AssertionError("aucun appel réseau ne doit avoir lieu sans clé d'API")

    monkeypatch.setattr(coingecko_service.requests, "get", _appel_interdit)

    assert coingecko_service.fetch_price("BTC") is None


def test_fetch_price_succes_extrait_prix_et_nom(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINGECKO_API_KEY", "cle-test")
    reponse = _FausseReponseJSON(200, _corps_coingecko("BTC", "Bitcoin", 61234.56))
    monkeypatch.setattr(coingecko_service.requests, "get", lambda *a, **k: reponse)

    resultat = coingecko_service.fetch_price("BTC")

    assert resultat == {"prix_actuel": pytest.approx(61234.56), "nom": "Bitcoin"}


def test_fetch_price_transmet_le_symbole_en_minuscule_et_vs_currency_eur(monkeypatch):
    """Non-régression du bug d'origine : la requête part avec LE SYMBOLE demandé,
    jamais une recherche floue façon `yf.Search` susceptible de dévier vers un
    autre actif — et `vs_currency=eur` est bien demandé explicitement à l'API
    (pas de conversion de change à faire côté application, comme `justetf_service`).
    CoinGecko attend les symboles en minuscule."""
    monkeypatch.setenv("PATRIMOINE_COINGECKO_API_KEY", "cle-test")
    appels = {}

    def _get(url, headers, params, timeout):
        appels["url"] = url
        appels["headers"] = headers
        appels["params"] = params
        return _FausseReponseJSON(200, _corps_coingecko("pkn", "Peankino", 0.42))

    monkeypatch.setattr(coingecko_service.requests, "get", _get)

    resultat = coingecko_service.fetch_price("PKN")

    assert resultat == {"prix_actuel": pytest.approx(0.42), "nom": "Peankino"}
    assert appels["params"] == {"vs_currency": "eur", "symbols": "pkn"}
    assert appels["headers"]["x-cg-demo-api-key"] == "cle-test"


def test_plusieurs_correspondances_retient_le_market_cap_rank_le_plus_bas(monkeypatch):
    """CoinGecko peut renvoyer plusieurs jetons pour un même symbole (jetons
    "meme"/clones) — `market_cap_rank` (le plus établi = le plus bas) départage,
    jamais le premier de la liste au hasard."""
    monkeypatch.setenv("PATRIMOINE_COINGECKO_API_KEY", "cle-test")
    corps = [
        {"id": "pkn-obscur-clone", "symbol": "pkn", "name": "PKN Obscur Clone", "current_price": 0.0001, "market_cap_rank": 4821},
        {"id": "peankino", "symbol": "pkn", "name": "Peankino", "current_price": 0.42, "market_cap_rank": 312},
    ]
    monkeypatch.setattr(coingecko_service.requests, "get", lambda *a, **k: _FausseReponseJSON(200, corps))

    resultat = coingecko_service.fetch_price("PKN")

    assert resultat == {"prix_actuel": pytest.approx(0.42), "nom": "Peankino"}


def test_symbole_inconnu_de_coingecko_renvoie_none(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINGECKO_API_KEY", "cle-test")
    reponse = _FausseReponseJSON(200, [])
    monkeypatch.setattr(coingecko_service.requests, "get", lambda *a, **k: reponse)

    assert coingecko_service.fetch_price("INTROUVABLE") is None


def test_fetch_price_echec_reseau_renvoie_none(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINGECKO_API_KEY", "cle-test")

    def leve(*args, **kwargs):
        raise ConnectionError("panne réseau simulée")

    monkeypatch.setattr(coingecko_service.requests, "get", leve)

    assert coingecko_service.fetch_price("BTC") is None


def test_fetch_price_statut_non_200_renvoie_none(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINGECKO_API_KEY", "cle-test")
    reponse = _FausseReponseJSON(401, {})
    monkeypatch.setattr(coingecko_service.requests, "get", lambda *a, **k: reponse)

    assert coingecko_service.fetch_price("BTC") is None


def test_fetch_price_json_inattendu_renvoie_none(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINGECKO_API_KEY", "cle-test")
    reponse = _FausseReponseJSON(200, {"autreChose": True})  # dict au lieu d'une liste
    monkeypatch.setattr(coingecko_service.requests, "get", lambda *a, **k: reponse)

    assert coingecko_service.fetch_price("BTC") is None


def test_prix_nul_renvoie_none(monkeypatch):
    """`current_price` peut être `null` côté CoinGecko (actif délisté/gelé) — ne
    doit jamais devenir un `float(None)`, qui lèverait."""
    monkeypatch.setenv("PATRIMOINE_COINGECKO_API_KEY", "cle-test")
    corps = [{"id": "bitcoin", "symbol": "btc", "name": "Bitcoin", "current_price": None, "market_cap_rank": 1}]
    monkeypatch.setattr(coingecko_service.requests, "get", lambda *a, **k: _FausseReponseJSON(200, corps))

    assert coingecko_service.fetch_price("BTC") is None
