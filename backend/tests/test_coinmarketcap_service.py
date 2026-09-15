"""Verrouille `coinmarketcap_service.fetch_price` (15/09/2026, retour
utilisateur : une crypto Ledger "PKN" résolvait à tort vers l'action polonaise
Orlen S.A. via `yf.Search` — cf. docstring du module). Même style de tests que
`test_justetf_service.py` (`fetch_price`), la source directe dont ce module
s'inspire."""

import pytest

from app.services import coinmarketcap_service


class _FausseReponseJSON:
    def __init__(self, status_code: int, corps: dict):
        self.status_code = status_code
        self._corps = corps

    def json(self):
        return self._corps


def _corps_cmc(symbol: str, name: str, prix_eur: float, cmc_rank: int | None = 1) -> dict:
    entree: dict = {"name": name, "symbol": symbol, "quote": {"EUR": {"price": prix_eur}}}
    if cmc_rank is not None:
        entree["cmc_rank"] = cmc_rank
    return {"data": {symbol: [entree]}}


def test_sans_cle_api_ne_tente_aucun_appel_reseau(monkeypatch):
    monkeypatch.delenv("PATRIMOINE_COINMARKETCAP_API_KEY", raising=False)

    def _appel_interdit(*args, **kwargs):
        raise AssertionError("aucun appel réseau ne doit avoir lieu sans clé d'API")

    monkeypatch.setattr(coinmarketcap_service.requests, "get", _appel_interdit)

    assert coinmarketcap_service.fetch_price("BTC") is None


def test_fetch_price_succes_extrait_prix_et_nom(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINMARKETCAP_API_KEY", "cle-test")
    reponse = _FausseReponseJSON(200, _corps_cmc("BTC", "Bitcoin", 61234.56))
    monkeypatch.setattr(coinmarketcap_service.requests, "get", lambda *a, **k: reponse)

    resultat = coinmarketcap_service.fetch_price("BTC")

    assert resultat == {"prix_actuel": pytest.approx(61234.56), "nom": "Bitcoin"}


def test_fetch_price_transmet_le_symbole_et_convert_eur(monkeypatch):
    """Non-régression du bug d'origine : la requête part avec LE SYMBOLE demandé,
    jamais une recherche floue façon `yf.Search` susceptible de dévier vers un
    autre actif — et `convert=EUR` est bien demandé explicitement à l'API (pas de
    conversion de change à faire côté application, comme `justetf_service`)."""
    monkeypatch.setenv("PATRIMOINE_COINMARKETCAP_API_KEY", "cle-test")
    appels = {}

    def _get(url, headers, params, timeout):
        appels["url"] = url
        appels["headers"] = headers
        appels["params"] = params
        return _FausseReponseJSON(200, _corps_cmc("PKN", "Peankino", 0.42))

    monkeypatch.setattr(coinmarketcap_service.requests, "get", _get)

    resultat = coinmarketcap_service.fetch_price("PKN")

    assert resultat == {"prix_actuel": pytest.approx(0.42), "nom": "Peankino"}
    assert appels["params"] == {"symbol": "PKN", "convert": "EUR"}
    assert appels["headers"]["X-CMC_PRO_API_KEY"] == "cle-test"


def test_plusieurs_correspondances_retient_le_cmc_rank_le_plus_bas(monkeypatch):
    """Comme Yahoo, CoinMarketCap peut renvoyer plusieurs jetons pour un même
    symbole (jetons "meme"/clones) — `cmc_rank` (le plus établi = le plus bas)
    départage, jamais le premier de la liste au hasard."""
    monkeypatch.setenv("PATRIMOINE_COINMARKETCAP_API_KEY", "cle-test")
    corps = {
        "data": {
            "PKN": [
                {"name": "PKN Obscur Clone", "symbol": "PKN", "cmc_rank": 4821, "quote": {"EUR": {"price": 0.0001}}},
                {"name": "Peankino", "symbol": "PKN", "cmc_rank": 312, "quote": {"EUR": {"price": 0.42}}},
            ]
        }
    }
    monkeypatch.setattr(coinmarketcap_service.requests, "get", lambda *a, **k: _FausseReponseJSON(200, corps))

    resultat = coinmarketcap_service.fetch_price("PKN")

    assert resultat == {"prix_actuel": pytest.approx(0.42), "nom": "Peankino"}


def test_symbole_inconnu_de_coinmarketcap_renvoie_none(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINMARKETCAP_API_KEY", "cle-test")
    reponse = _FausseReponseJSON(200, {"data": {}})
    monkeypatch.setattr(coinmarketcap_service.requests, "get", lambda *a, **k: reponse)

    assert coinmarketcap_service.fetch_price("INTROUVABLE") is None


def test_fetch_price_echec_reseau_renvoie_none(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINMARKETCAP_API_KEY", "cle-test")

    def leve(*args, **kwargs):
        raise ConnectionError("panne réseau simulée")

    monkeypatch.setattr(coinmarketcap_service.requests, "get", leve)

    assert coinmarketcap_service.fetch_price("BTC") is None


def test_fetch_price_statut_non_200_renvoie_none(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINMARKETCAP_API_KEY", "cle-test")
    reponse = _FausseReponseJSON(401, {})
    monkeypatch.setattr(coinmarketcap_service.requests, "get", lambda *a, **k: reponse)

    assert coinmarketcap_service.fetch_price("BTC") is None


def test_fetch_price_json_inattendu_renvoie_none(monkeypatch):
    monkeypatch.setenv("PATRIMOINE_COINMARKETCAP_API_KEY", "cle-test")
    reponse = _FausseReponseJSON(200, {"autreChose": True})
    monkeypatch.setattr(coinmarketcap_service.requests, "get", lambda *a, **k: reponse)

    assert coinmarketcap_service.fetch_price("BTC") is None


def test_prix_nul_renvoie_none(monkeypatch):
    """`quote.EUR.price` peut être `null` côté CoinMarketCap (actif délisté/gelé) —
    ne doit jamais devenir un `float(None)`, qui lèverait."""
    monkeypatch.setenv("PATRIMOINE_COINMARKETCAP_API_KEY", "cle-test")
    corps = {"data": {"BTC": [{"name": "Bitcoin", "symbol": "BTC", "cmc_rank": 1, "quote": {"EUR": {"price": None}}}]}}
    monkeypatch.setattr(coinmarketcap_service.requests, "get", lambda *a, **k: _FausseReponseJSON(200, corps))

    assert coinmarketcap_service.fetch_price("BTC") is None
