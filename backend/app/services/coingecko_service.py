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
confondre, une clé Demo est refusée sur l'URL Pro et réciproquement.

`fetch_market_chart` (retour utilisateur du 17/09/2026) complète `fetch_price` avec
l'historique de cours (`/coins/{id}/market_chart`, jusqu'à un an sur le plan Demo)
— branché dans `cours_service.rafraichir_crypto`, qui alimente `CoursHistorique`
exactement comme `cours_service.rafraichir` le fait pour yfinance, pour que la
fiche d'une ligne crypto affiche enfin un historique de performance (cf. § AE.3 du
backlog, qui documentait ce manque comme délibérément différé, pas résolu)."""

import os
from datetime import UTC, datetime

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
_URL_BASE = "https://api.coingecko.com/api/v3"
_URL_COTATION = f"{_URL_BASE}/coins/markets"

# Fenêtre d'historique demandée à `/coins/{id}/market_chart` (retour utilisateur du
# 17/09/2026 : « l'historique de performance n'est pas présent » pour une ligne
# crypto) — le plan Demo gratuit couvre jusqu'à un an d'historique quotidien (cf.
# docstring de module), au-delà l'API renvoie une erreur plutôt qu'une troncature
# silencieuse ; 365 jours est donc le maximum sûr, pas un choix arbitraire.
JOURS_HISTORIQUE_MAX = 365


def _resoudre_meilleure_correspondance(symbol: str) -> dict | None:
    """`GET /coins/markets`, commun à `fetch_price` et `fetch_market_chart` — la
    même correspondance symbole -> jeton CoinGecko sert aux deux usages : le prix
    actuel ET l'identifiant CoinGecko (`id`, ex. `"bitcoin"`) nécessaire à
    l'historique, que cette réponse porte déjà gratuitement (`fetch_market_chart`
    n'a donc jamais besoin d'un appel réseau supplémentaire pour résoudre l'`id`).

    Plusieurs jetons peuvent légitimement partager un même symbole sur CoinGecko
    (les jetons "meme"/clones sont fréquents) : la correspondance retenue est celle
    au `market_cap_rank` le plus bas (la plus établie/la plus échangée), à défaut la
    première de la liste — une ambiguïté résiduelle documentée plutôt que prétendre
    la résoudre parfaitement, mais sans risque de confondre une crypto avec un titre
    coté d'une tout autre nature, ce qui est le bug que ce module corrige (cf.
    docstring de module). `None` sur tout échec — clé d'API absente, erreur réseau,
    statut non 200, symbole inconnu de CoinGecko, JSON inattendu."""
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
        return min(
            correspondances,
            key=lambda c: c.get("market_cap_rank") if c.get("market_cap_rank") is not None else float("inf"),
        )
    except Exception:
        return None


def fetch_price(symbol: str) -> dict | None:
    """Cours EN EUR d'une cryptomonnaie, par son symbole (`vs_currency=eur` demandé
    explicitement à l'API — comme `justetf_service.fetch_price`, aucune conversion
    de change à faire côté application, contrairement au pipeline yfinance).

    Renvoie `{"prix_actuel": float, "nom": str}` sur succès, `None` sur tout échec
    — cf. `_resoudre_meilleure_correspondance` pour le détail des cas."""
    meilleure = _resoudre_meilleure_correspondance(symbol)
    if meilleure is None:
        return None
    prix = meilleure.get("current_price")
    if prix is None:
        return None
    return {"prix_actuel": float(prix), "nom": meilleure.get("name")}


def fetch_market_chart(symbol: str, jours: int = JOURS_HISTORIQUE_MAX) -> list[tuple[str, float]] | None:
    """Historique de cours EN EUR d'une cryptomonnaie, par son symbole — retour
    utilisateur du 17/09/2026 : l'historique de performance manquait pour toute
    ligne crypto (jamais branché lors du passage à CoinGecko le 15/09, cf. § AE.3
    du backlog, délibérément différé faute de temps à l'époque).

    `GET /coins/{id}/market_chart` : pas d'`interval` explicite dans les paramètres
    — l'API choisit elle-même la granularité selon `days` (quotidienne au-delà de
    quelques jours), et le plan Demo n'autorise de toute façon plus la sélection
    manuelle d'intervalle depuis fin 2024 ; la demander produirait une erreur 401
    plutôt qu'un historique plus fin.

    Renvoie une liste `(date ISO, clôture)` triée par date croissante — même forme
    que `cours_service._lire`/`_ecrire`, pour s'insérer dans ce module sans
    transformation. CoinGecko peut renvoyer plusieurs points pour une même journée
    en fin de fenêtre (granularité horaire résiduelle) : seul le DERNIER point de
    chaque jour est conservé, même convention que `cours_service._ecrire` pour la
    semaine en cours d'un ticker yfinance. `None` sur tout échec (mêmes cas que
    `fetch_price`, plus un identifiant CoinGecko introuvable pour ce symbole ou une
    réponse sans le moindre point)."""
    meilleure = _resoudre_meilleure_correspondance(symbol)
    if meilleure is None:
        return None
    identifiant_coingecko = meilleure.get("id")
    if not identifiant_coingecko:
        return None

    cle_api = os.environ.get(_VARIABLE_API_KEY, "").strip()
    if not cle_api:
        return None

    try:
        reponse = requests.get(
            f"{_URL_BASE}/coins/{identifiant_coingecko}/market_chart",
            headers={"x-cg-demo-api-key": cle_api, "Accept": "application/json"},
            params={"vs_currency": "eur", "days": jours},
            timeout=_TIMEOUT_SECONDES,
        )
        if reponse.status_code != 200:
            return None
        prix = reponse.json().get("prices")
        if not prix:
            return None
        points: dict[str, float] = {}
        for timestamp_ms, valeur in prix:
            date_iso = datetime.fromtimestamp(timestamp_ms / 1000, tz=UTC).date().isoformat()
            points[date_iso] = float(valeur)
        return sorted(points.items())
    except Exception:
        return None
