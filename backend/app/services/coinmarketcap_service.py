"""Cours des cryptomonnaies via l'API CoinMarketCap (retour utilisateur du
15/09/2026) — remplace yfinance pour toute ligne `Holding.type_actif == "CRYPTO"`.

Contexte : une crypto Ledger identifiée par un ticker court (`PKN`, `Currency
Ticker` de l'export — cf. `ledger_import.py`) pouvait, via la recherche générale
`yf.Search` de `market_data_service.resolve_ticker`, résoudre vers un titre coté
totalement différent partageant le même symbole (ici l'action polonaise Orlen
S.A., ticker Yahoo `PKN.WA`) — Yahoo Finance mélange actions/ETF/crypto dans un
même espace de noms de recherche, sans garantie d'unicité. `resolve_ticker` a été
corrigé pour ne plus jamais substituer une classe d'actif à une autre (cf. sa
docstring), mais cela laisse simplement la crypto sans cotation quand Yahoo ne la
couvre pas — CoinMarketCap, spécialisé crypto, est une source strictement
meilleure pour cette classe d'actif : c'est lui qui fait désormais foi pour le
prix (et le nom) d'une position crypto, plus jamais Yahoo Finance.

Même philosophie défensive que `justetf_service.py` (module distinct, cf. sa
docstring) : toute erreur (réseau, statut HTTP, JSON inattendu, symbole inconnu de
CoinMarketCap) est absorbée localement et renvoie `None` — jamais d'exception qui
remonterait jusqu'à `market_data_service.refresh_tickers` et interromprait le
traitement des autres positions. Décision identique à celle déjà prise pour
justETF (2.4) : **aucun repli sur yfinance** en cas d'échec CoinMarketCap, pour ne
jamais mélanger deux sources de prix différentes pour la même position — et
surtout pour ne jamais rouvrir la porte au bug ci-dessus.

Authentification par clé d'API (`PATRIMOINE_COINMARKETCAP_API_KEY`, cf.
`.env.exemple`/`docs/MANUEL_EXPLOITATION.md` §4) : CoinMarketCap l'exige pour
TOUT appel, y compris le plan gratuit (10 000 crédits/mois, largement suffisant
pour un portefeuille personnel — chaque appel de ce module coûte 1 crédit, quel
que soit le nombre de symboles demandés jusqu'à 100). Clé absente/vide : `fetch_price`
renvoie `None` sans tenter le moindre appel réseau — l'utilisateur qui n'a pas
encore créé de clé voit simplement `erreur="Cotation indisponible (CoinMarketCap)"`
sur ses lignes crypto plutôt qu'un plantage, exactement comme un ETF sans
couverture justETF."""

import os

import requests

_TIMEOUT_SECONDES = 10

# Même philosophie que `justetf_service.DELAI_ENTRE_APPELS_JUSTETF_SECONDES`
# (neutralisé sous test via `PATRIMOINE_TESTING`), mais plus proche de celle de
# yfinance (`market_data_service.DELAI_ENTRE_APPELS_SECONDES`) : contrairement au
# scraping HTML de justETF, il s'agit ici d'une vraie API publique avec un SLA
# documenté (plan gratuit : 30 requêtes/minute) — pas besoin de la prudence
# supplémentaire réservée à une ressource sans support.
DELAI_ENTRE_APPELS_COINMARKETCAP_SECONDES = 0.0 if os.environ.get("PATRIMOINE_TESTING") else 0.3

_VARIABLE_API_KEY = "PATRIMOINE_COINMARKETCAP_API_KEY"
_URL_COTATION = "https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest"


def fetch_price(symbol: str) -> dict | None:
    """Cours EN EUR d'une cryptomonnaie, par son symbole (`convert=EUR` demandé
    explicitement à l'API — comme `justetf_service.fetch_price`, aucune conversion
    de change à faire côté application, contrairement au pipeline yfinance).

    Renvoie `{"prix_actuel": float, "nom": str}` sur succès, `None` sur tout échec
    — clé d'API absente, erreur réseau, statut non 200, symbole inconnu de
    CoinMarketCap, JSON inattendu.

    L'API v2 renvoie une LISTE de correspondances par symbole (plusieurs jetons
    peuvent légitimement partager un même symbole sur CoinMarketCap aussi — les
    jetons "meme"/clones sont fréquents) : la correspondance retenue est celle au
    `cmc_rank` le plus bas (la plus établie/la plus échangée), à défaut la
    première de la liste. Une ambiguïté résiduelle documentée plutôt que prétendre
    la résoudre parfaitement — mais sans risque de confondre une crypto avec un
    titre coté d'une tout autre nature, ce qui est le bug que ce module corrige."""
    cle_api = os.environ.get(_VARIABLE_API_KEY, "").strip()
    if not cle_api:
        return None

    try:
        reponse = requests.get(
            _URL_COTATION,
            headers={"X-CMC_PRO_API_KEY": cle_api, "Accept": "application/json"},
            params={"symbol": symbol, "convert": "EUR"},
            timeout=_TIMEOUT_SECONDES,
        )
        if reponse.status_code != 200:
            return None
        donnees = reponse.json()
        correspondances = donnees.get("data", {}).get(symbol.upper())
        if not correspondances:
            return None

        meilleure = min(
            correspondances,
            key=lambda c: c.get("cmc_rank") if c.get("cmc_rank") is not None else float("inf"),
        )
        prix = meilleure["quote"]["EUR"]["price"]
        if prix is None:
            return None
        return {"prix_actuel": float(prix), "nom": meilleure.get("name")}
    except Exception:
        return None
