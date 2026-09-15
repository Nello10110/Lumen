"""Cours des cryptomonnaies via l'API CoinGecko (retour utilisateur du 15/09/2026,
révisé le même jour : CoinMarketCap exige une carte bancaire dès l'inscription
même pour son plan gratuit — CoinGecko non) — remplace yfinance pour toute ligne
`Holding.type_actif == "CRYPTO"`.

Contexte : une crypto Ledger identifiée par un ticker court (`PKN`, `Currency
Ticker` de l'export — cf. `ledger_import.py`) pouvait, via la recherche générale
`yf.Search` de `market_data_service.resolve_ticker`, résoudre vers un titre coté
totalement différent partageant le même symbole (ici l'action polonaise Orlen
S.A., ticker Yahoo `PKN.WA`) — Yahoo Finance mélange actions/ETF/crypto dans un
même espace de noms de recherche, sans garantie d'unicité. `resolve_ticker` a été
corrigé pour ne plus jamais substituer une classe d'actif à une autre (cf. sa
docstring), mais cela laisse simplement la crypto sans cotation quand Yahoo ne la
couvre pas — CoinGecko, spécialisé crypto, est une source strictement meilleure
pour cette classe d'actif : c'est lui qui fait désormais foi pour le prix (et le
nom) d'une position crypto, plus jamais Yahoo Finance.

Même philosophie défensive que `justetf_service.py` (module distinct, cf. sa
docstring) : toute erreur (réseau, statut HTTP, JSON inattendu, symbole inconnu de
CoinGecko) est absorbée localement et renvoie `None` — jamais d'exception qui
remonterait jusqu'à `market_data_service.refresh_tickers` et interromprait le
traitement des autres positions. Décision identique à celle déjà prise pour
justETF (2.4) : **aucun repli sur yfinance** en cas d'échec CoinGecko, pour ne
jamais mélanger deux sources de prix différentes pour la même position — et
surtout pour ne jamais rouvrir la porte au bug ci-dessus.

Authentification par clé d'API « Demo » (`PATRIMOINE_COINGECKO_API_KEY`, cf.
`.env.exemple`/`docs/MANUEL_EXPLOITATION.md` §4) : gratuite, **sans carte
bancaire**, créée sur `coingecko.com/en/api/pricing` (bouton « Start for Free » du
plan Demo) — 10 000 crédits/mois, 100 requêtes/minute, largement suffisant pour un
portefeuille personnel (chaque appel de ce module coûte 1 crédit). Clé
absente/vide : `fetch_price` renvoie `None` sans tenter le moindre appel réseau —
l'utilisateur qui n'a pas encore créé de clé voit simplement
`erreur="Cotation indisponible (CoinGecko)"` sur ses lignes crypto plutôt qu'un
plantage, exactement comme un ETF sans couverture justETF. Base d'URL Demo
(`api.coingecko.com`, en-tête `x-cg-demo-api-key`), distincte de celle des plans
payants (`pro-api.coingecko.com`, en-tête `x-cg-pro-api-key`) — ne jamais les
confondre, une clé Demo est refusée sur l'URL Pro et réciproquement."""

import os

import requests

_TIMEOUT_SECONDES = 10

# Même philosophie que `justetf_service.DELAI_ENTRE_APPELS_JUSTETF_SECONDES`
# (neutralisé sous test via `PATRIMOINE_TESTING`), mais plus proche de celle de
# yfinance (`market_data_service.DELAI_ENTRE_APPELS_SECONDES`) : contrairement au
# scraping HTML de justETF, il s'agit ici d'une vraie API publique avec un SLA
# documenté (plan Demo : 100 requêtes/minute) — pas besoin de la prudence
# supplémentaire réservée à une ressource sans support.
DELAI_ENTRE_APPELS_COINGECKO_SECONDES = 0.0 if os.environ.get("PATRIMOINE_TESTING") else 0.3

_VARIABLE_API_KEY = "PATRIMOINE_COINGECKO_API_KEY"
_URL_COTATION = "https://api.coingecko.com/api/v3/coins/markets"


def fetch_price(symbol: str) -> dict | None:
    """Cours EN EUR d'une cryptomonnaie, par son symbole (`vs_currency=eur` demandé
    explicitement à l'API — comme `justetf_service.fetch_price`, aucune conversion
    de change à faire côté application, contrairement au pipeline yfinance).

    Renvoie `{"prix_actuel": float, "nom": str}` sur succès, `None` sur tout échec
    — clé d'API absente, erreur réseau, statut non 200, symbole inconnu de
    CoinGecko, JSON inattendu.

    `GET /coins/markets` (plutôt que `/simple/price`) : renvoie pour chaque
    correspondance un `market_cap_rank` directement exploitable — plusieurs jetons
    peuvent légitimement partager un même symbole sur CoinGecko aussi (les jetons
    "meme"/clones sont fréquents), la correspondance retenue est celle au
    `market_cap_rank` le plus bas (la plus établie/la plus échangée), à défaut la
    première de la liste. Une ambiguïté résiduelle documentée plutôt que prétendre
    la résoudre parfaitement — mais sans risque de confondre une crypto avec un
    titre coté d'une tout autre nature, ce qui est le bug que ce module corrige."""
    cle_api = os.environ.get(_VARIABLE_API_KEY, "").strip()
    if not cle_api:
        return None

    try:
        reponse = requests.get(
            _URL_COTATION,
            headers={"x-cg-demo-api-key": cle_api, "Accept": "application/json"},
            params={"vs_currency": "eur", "symbols": symbol.lower()},
            timeout=_TIMEOUT_SECONDES,
        )
        if reponse.status_code != 200:
            return None
        correspondances = reponse.json()
        if not correspondances:
            return None

        meilleure = min(
            correspondances,
            key=lambda c: c.get("market_cap_rank") if c.get("market_cap_rank") is not None else float("inf"),
        )
        prix = meilleure.get("current_price")
        if prix is None:
            return None
        return {"prix_actuel": float(prix), "nom": meilleure.get("name")}
    except Exception:
        return None
