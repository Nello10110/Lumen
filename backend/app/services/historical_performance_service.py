"""Historique de la valeur du portefeuille dans le temps, pour le graphique
d'évolution du tableau de bord. Contrairement au reste de l'application (cours
instantanés via `.info`), ce module s'appuie sur `yfinance` `.history()` pour
récupérer des séries de prix hebdomadaires depuis la première transaction —
un appel par titre/devise, jamais un appel par date.

Les deux fonctions publiques (`compute_portfolio_history`, `compute_holding_price_history`)
sont mises en cache via `services/historique_cache.py` (cf. LOT 4.4/4.5) : plusieurs
secondes d'appels réseau à chaque ouverture de fiche/tableau de bord, pour une série
hebdomadaire qui ne bouge qu'une fois par jour au mieux.
"""

import bisect
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from ..models import Holding, Transaction
from . import (
    analysis_service,
    cours_service,
    historique_cache,
    market_data_service,
    metriques_performance_service,
    performance_service,
    portfolio_reconstruction,
)
from .portfolio_reconstruction import PositionState

EPSILON = portfolio_reconstruction.EPSILON

TimeSeries = list[tuple[datetime, float]]


def _weekly_grid(start: datetime, end: datetime) -> list[datetime]:
    grid = []
    d = start
    while d <= end:
        grid.append(d)
        d += timedelta(weeks=1)
    if not grid or grid[-1] < end:
        grid.append(end)
    return grid


def _value_at(history: TimeSeries, date: datetime) -> float | None:
    """Dernière valeur connue à date <= `date`. `history` doit être trié par date
    croissante (contrat inchangé). Recherche dichotomique (cf. LOT 4.6) plutôt que
    parcours linéaire : cette fonction est appelée dans une boucle grille hebdomadaire
    x positions, un parcours O(n) à chaque appel rend le coût total quadratique en
    l'ancienneté du portefeuille. `bisect_right` sur les dates donne l'index du premier
    point strictement postérieur à `date` ; le point cherché est celui juste avant —
    strictement équivalent au parcours linéaire précédent, y compris pour des dates
    dupliquées dans `history` (on retient alors la dernière occurrence, comme le
    parcours qui ne s'arrêtait qu'au premier `d > date`)."""
    idx = bisect.bisect_right(history, date, key=lambda point: point[0])
    if idx == 0:
        return None
    return history[idx - 1][1]


# `_history_to_series`, `_devise_historique_yfinance` et `_fetch_fx_history` ont
# quitté ce module (backlog § AB) : la lecture des cours et la conversion de
# change appartiennent désormais à `cours_service`, qui les adosse à la base au
# lieu de refaire un aller-retour réseau à chaque calcul. Leur logique — troncature
# de date en UTC, devise lue sur `info` et jamais sur `MarketDataCache.devise`,
# pence divisés par cent — y est reprise à l'identique et verrouillée par
# `tests/test_cours_service.py`.


def _serie_cumulee_ventes_et_revenus(
    db: Session, user_id: int, cles_filtres: set[tuple[str, int | None]] | None = None
) -> TimeSeries:
    """Somme cumulée, dans le temps, de tout ce que le graphique d'historique
    omettait jusqu'ici : le produit net de chaque vente (`TRADING/SELL`) et les
    revenus perçus (dividendes, intérêts, autres revenus). Même périmètre exact
    que `performance_service.compute_performance` (`gains_realises` — composante
    "produit de vente" — + `dividendes_percus` + `interets_percus` +
    `autres_revenus`), réutilisant `AUTRES_REVENUS_TYPES` de ce module pour ne
    jamais diverger silencieusement de sa définition. Construite directement
    depuis `Transaction` plutôt que via `PositionState` : les intérêts n'ont
    généralement pas de `symbol` et ne passent donc jamais par
    `portfolio_reconstruction` (dont la requête filtre `symbol IS NOT NULL`).

    `valeur_portefeuille - valeur_investie` (les deux champs historiques) ne
    couvrait donc que la valeur de marché des positions encore ouvertes moins le
    capital brut jamais décrémenté à la vente — en omettant entièrement ces
    montants. Ce cumul comble l'écart : `valeur_portefeuille +
    valeur_realisee_cumulee - valeur_investie` reconstitue exactement la même
    formule que `gain_perte_total`, terme à terme.

    `cles_filtres` (graphique filtrable de l'écran Analyse, retour utilisateur du
    13/09/2026 ; devenu `(symbol, compte_id)` le 14/09/2026 — un filtre "compte A"
    sur un ticker seul incluait à tort les mouvements du même ticker au compte B)
    : restreint la somme aux mouvements dont `(symbol, compte_id)` appartient à cet
    ensemble. Filtré en Python (pas un `IN` SQL sur tuple, peu portable) — le
    volume ici (transactions d'UN utilisateur) reste largement dans ce budget,
    même patron que `_trier_pour_reconstruction`. Un mouvement SANS `symbol`
    (intérêts, bonus courtier) devient alors exclu d'une vue filtrée, faute de
    pouvoir l'attribuer à un sous-ensemble précis — comportement assumé, pas un
    oubli."""
    transactions = (
        db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.datetime_utc.asc()).all()
    )
    if cles_filtres is not None:
        transactions = [tx for tx in transactions if (tx.symbol, tx.compte_id) in cles_filtres]

    series: TimeSeries = []
    cumule = 0.0
    for tx in transactions:
        if tx.category == "TRADING" and tx.type == "SELL" and tx.shares is not None:
            montant = tx.amount + tx.fee + tx.tax
        elif tx.category == "CASH" and tx.type == "DIVIDEND":
            montant = tx.amount + tx.fee + tx.tax
        elif tx.category == "CASH" and tx.type == "INTEREST_PAYMENT":
            montant = tx.amount + tx.fee + tx.tax
        elif tx.type in performance_service.AUTRES_REVENUS_TYPES:
            montant = tx.amount + tx.fee + tx.tax
        else:
            continue
        cumule += montant
        series.append((tx.datetime_utc, cumule))
    return series


def _valeur_positions_live(db: Session, user_id: int, cles_filtres: set[tuple[str, int | None]] | None = None) -> float:
    """Valorisation « live » des positions financières ouvertes — exactement le
    même calcul que `valeur_positions` dans `performance_service.compute_performance`
    (`analysis_service.holdings_financiers` + `value_holdings`). Utilisée
    uniquement pour le DERNIER point de la grille hebdomadaire (aujourd'hui) : les
    points passés restent nécessairement valorisés au dernier cours hebdomadaire
    `yfinance` connu (pas d'historique de cours instantané disponible), mais le
    point d'aujourd'hui peut — et doit — coïncider exactement avec la carte
    Rentabilité globale plutôt que de rester approximatif de quelques euros.

    `cles_filtres` : restreint aux holdings dont `(ticker, compte_id)` appartient à
    cet ensemble (graphique filtrable de l'écran Analyse ; devenu compte-exact le
    14/09/2026 — un filtre par ticker seul incluait à tort la part d'un AUTRE
    compte partageant ce ticker) — SANS ce filtre, le dernier point d'une courbe
    déjà filtrée afficherait la valeur de TOUT le portefeuille au lieu du seul
    sous-ensemble affiché, un décrochage visible en fin de courbe."""
    holdings = analysis_service.holdings_financiers(db, user_id)
    if cles_filtres is not None:
        holdings = [h for h in holdings if (h.ticker, h.compte_id) in cles_filtres]
    valued = analysis_service.value_holdings(holdings)
    return sum(v.valeur for v in valued)


# Champs du point tel que produit par `_compute_portfolio_history` ci-dessous — sert à
# détecter un cache écrit par une version antérieure du schéma, cf.
# `historique_cache.forme_valide`.
_CHAMPS_POINT_PORTEFEUILLE = {"date", "valeur_portefeuille", "valeur_investie", "valeur_realisee_cumulee"}


def compute_portfolio_history(
    db: Session,
    user_id: int,
    positions: dict[tuple[str, int | None], PositionState] | None = None,
    cles_filtres: set[tuple[str, int | None]] | None = None,
) -> list[dict]:
    """Historique de valeur du portefeuille d'UN utilisateur (Milestone 2a, cf. LOT 4.5).

    Mis en cache (`historique_cache`, clé `cle_historique_portefeuille(user_id, ...)` —
    scopée par utilisateur depuis Milestone 2a, sans quoi le premier utilisateur à
    calculer son historique verrait sa donnée servie à tous les autres tant que le
    cache est valide) : en cas de lecture à chaud, aucun accès au grand livre ni à
    `yfinance` n'a lieu, `positions` n'est alors même pas consulté. En cas de lecture
    à froid, `positions` — cf. LOT 4.3 — évite de rejouer le grand livre si l'appelant
    l'a déjà calculé ; recalculé sinon.

    `cles_filtres` (graphique filtrable par classe d'actif/compte de l'écran Analyse,
    retour utilisateur du 13/09/2026 ; devenu `(ticker, compte_id)` le 14/09/2026 —
    un filtre par ticker seul incluait à tort la part d'un AUTRE compte partageant
    ce ticker) : `None` = comportement historique inchangé (portefeuille entier, clé
    de cache inchangée — le tableau de bord n'est jamais affecté) ; sinon restreint
    le calcul à ces seules positions, avec sa PROPRE entrée de cache (cf.
    `historique_cache.cle_historique_portefeuille`)."""
    cle = historique_cache.cle_historique_portefeuille(user_id, cles_filtres)
    en_cache = historique_cache.lire(db, cle)
    if en_cache is not None and historique_cache.forme_valide(en_cache, _CHAMPS_POINT_PORTEFEUILLE):
        return en_cache

    toutes_positions = positions if positions is not None else portfolio_reconstruction.compute_positions(db, user_id)
    positions_filtrees = (
        toutes_positions
        if cles_filtres is None
        else {cle_pos: state for cle_pos, state in toutes_positions.items() if cle_pos in cles_filtres}
    )
    points = _compute_portfolio_history(db, user_id, positions_filtrees, cles_filtres)
    historique_cache.ecrire(db, cle, points)
    return points


def _compute_portfolio_history(
    db: Session,
    user_id: int,
    positions: dict[tuple[str, int | None], PositionState],
    cles_filtres: set[tuple[str, int | None]] | None = None,
) -> list[dict]:
    starts = [state.shares_history[0][0] for state in positions.values() if state.shares_history]
    if not starts:
        return []

    start = min(starts)
    now = datetime.now(UTC).replace(tzinfo=None)
    grid = _weekly_grid(start, now)

    # `(ticker, compte_id)` -> `Holding` (revu le 14/09/2026, cf. docstring de
    # module) — deux lignes peuvent désormais partager un ticker.
    holdings_par_cle = {(h.ticker, h.compte_id): h for h in db.query(Holding).filter(Holding.user_id == user_id).all()}
    # Les séries de COURS, elles, restent indexées par ticker seul : une donnée de
    # marché publique, partagée par toute position de ce ticker quel que soit son
    # compte — un seul téléchargement/lecture, jamais dupliqué par compte.
    price_series: dict[str, TimeSeries] = {}

    # Les séries de cours viennent de la BASE (`cours_service`, backlog § AB), plus du
    # réseau : téléchargées une seule fois par ticker dans leur vie, puis complétées
    # de façon incrémentale, et partagées avec la fiche d'une position et la
    # comparaison à un indice — qui allaient chacune chercher la même donnée de leur
    # côté. C'est ce qui fait passer ce calcul de 23,4 s à sa part locale (0,4 s
    # mesurées, § AB.0) une fois les séries en place.
    #
    # Les dates y sont tronquées au jour, là où le téléchargement direct gardait
    # l'heure de clôture : sans effet sur `_value_at`, qui cherche la dernière valeur
    # connue à date <= point de grille — une série hebdomadaire n'a jamais deux points
    # le même jour, et un point tronqué devient disponible au plus tôt le jour même.
    for (symbol, _compte_id), state in positions.items():
        if not state.shares_history or symbol in price_series:
            continue
        # CRYPTO exclue (15/09/2026, cf. `coinmarketcap_service`) : plus de ticker
        # Yahoo à résoudre pour elle, et CoinMarketCap ne fournit pas d'historique
        # sur son plan gratuit — la courbe du portefeuille retombe sur
        # `prix_revient_moyen` pour ces points (`_value_at` ci-dessous, comme pour
        # toute autre position sans série connue), jamais sur un titre sans rapport.
        if state.asset_class == "CRYPTO":
            continue
        ticker_resolu = market_data_service.resolve_ticker(db, symbol, state.asset_class)
        if ticker_resolu is None:
            continue
        serie = cours_service.serie_en_euros(db, ticker_resolu)
        if serie:
            price_series[symbol] = serie

    revenus_series = _serie_cumulee_ventes_et_revenus(db, user_id, cles_filtres)

    points = []
    for date in grid:
        valeur_portefeuille = 0.0
        valeur_investie = 0.0
        for (symbol, compte_id), state in positions.items():
            valeur_investie += _value_at(state.invested_history, date) or 0.0

            shares_at = _value_at(state.shares_history, date) or 0.0
            if shares_at <= EPSILON:
                continue

            prix_at = _value_at(price_series.get(symbol, []), date)
            if prix_at is None:
                holding = holdings_par_cle.get((symbol, compte_id))
                prix_at = holding.prix_revient_moyen if holding else 0.0
            valeur_portefeuille += shares_at * (prix_at or 0.0)

        # Dernier point de la grille (toujours "aujourd'hui", cf. `_weekly_grid`) :
        # remplace le prix hebdomadaire — potentiellement vieux de quelques jours —
        # par la même valorisation « live » que la carte Rentabilité globale, pour
        # une coïncidence exacte plutôt qu'une approximation à quelques euros près.
        if date == grid[-1]:
            valeur_portefeuille = _valeur_positions_live(db, user_id, cles_filtres)

        points.append(
            {
                "date": date.date().isoformat(),
                "valeur_portefeuille": round(valeur_portefeuille, 2),
                "valeur_investie": round(valeur_investie, 2),
                "valeur_realisee_cumulee": round(_value_at(revenus_series, date) or 0.0, 2),
            }
        )

    return points


# Indices de référence proposés pour la comparaison de performance (backlog 2.P.2) —
# ensemble volontairement restreint et choisi à l'avance (pas de ticker arbitraire
# saisi par l'utilisateur) : évite toute résolution/validation d'un identifiant
# quelconque, et garantit que chaque option a été vérifiée manuellement comme
# disponible sur `yfinance`. Tickers ETF/indice plutôt que "vrais" indices bruts
# quand plus fiables historiquement sur `yfinance` (ex. `URTH` réplique le MSCI World).
BENCHMARKS: dict[str, dict[str, str]] = {
    "MSCI_WORLD": {"label": "MSCI World", "ticker": "URTH"},
    "SP500": {"label": "S&P 500", "ticker": "^GSPC"},
    "CAC40": {"label": "CAC 40", "ticker": "^FCHI"},
    "STOXX600": {"label": "STOXX Europe 600", "ticker": "^STOXX"},
}


def _fetch_benchmark_series(db: Session, ticker: str) -> TimeSeries:
    """Historique complet d'un indice de référence, en euros.

    Passe par `cours_service` (backlog § AB) comme n'importe quelle autre série : un
    indice est une donnée de marché publique, au même titre qu'un titre, et n'a donc
    besoin ni de son propre téléchargement ni de son propre cache JSON — la table
    `cours_historique` joue exactement le rôle que tenait
    `historique_cache.cle_historique_benchmark`, en le partageant avec tout le reste."""
    return cours_service.serie_en_euros(db, ticker)


def compute_benchmark_history(db: Session, benchmark_key: str, points: list[dict]) -> dict | None:
    """Compare la performance du portefeuille à un indice de référence choisi par
    l'utilisateur (backlog 2.P.2), sur EXACTEMENT les mêmes dates que `points`
    (`compute_portfolio_history`, déjà calculé par l'appelant — pas de second calcul
    de grille ici). Les deux séries sont normalisées en pourcentage depuis leur
    valeur au premier point commun, pour rester comparables quelle que soit l'échelle
    (un portefeuille de quelques milliers d'euros contre un indice coté en points).

    Côté portefeuille, `portefeuille_pct` est un TWR cumulé point à point
    (`metriques_performance_service.serie_twr_cumulee_pct`), PAS un simple ratio de
    valeur brute (`valeur_portefeuille[i] / valeur_portefeuille[0]`, comportement
    d'origine corrigé le 09/09/2026 — retour utilisateur : « le portefeuille à 17
    190 % » face à un indice à 43 %). Un ratio brut se laisse fausser par tout apport
    versé depuis le premier point suivi : un portefeuille ayant reçu, disons, 100 fois
    sa valeur de départ en versements affiche alors une « performance » à quatre
    chiffres qui ne mesure en réalité que l'épargne accumulée, pas un rendement — donc
    rien de comparable à la performance PURE d'un indice. Le TWR neutralise cet effet
    exactement comme pour la carte Métriques avancées (`twr_cumule_pct`), la référence
    déjà correcte juste à côté sur cet écran.

    `None` si `benchmark_key` est inconnu, si moins de 2 points sont fournis, ou si
    aucune donnée `yfinance` n'est disponible pour cet indice sur la période — jamais
    une exception propagée jusqu'au routeur."""
    benchmark = BENCHMARKS.get(benchmark_key)
    if benchmark is None or len(points) < 2:
        return None

    # Plus de cache JSON dédié (`cle_historique_benchmark`) : la série vit désormais
    # dans `cours_historique`, qui la partage avec tous les autres usages et la
    # complète de façon incrémentale (backlog § AB.2) — un cache de plus par-dessus
    # ne ferait que dupliquer la même donnée sous une deuxième forme, avec sa propre
    # expiration à faire coïncider.
    serie = _fetch_benchmark_series(db, benchmark["ticker"])
    if not serie:
        return None

    dates = [datetime.fromisoformat(p["date"]) for p in points]
    prix_base = _value_at(serie, dates[0])
    if prix_base is None or prix_base == 0:
        return None

    portefeuille_pcts = metriques_performance_service.serie_twr_cumulee_pct(points)
    comparaison = []
    for date, point, portefeuille_pct in zip(dates, points, portefeuille_pcts, strict=True):
        prix_at = _value_at(serie, date)
        benchmark_pct = round((prix_at / prix_base - 1) * 100, 2) if prix_at is not None else None
        comparaison.append({"date": point["date"], "portefeuille_pct": round(portefeuille_pct, 2), "benchmark_pct": benchmark_pct})

    return {"benchmark_key": benchmark_key, "label": benchmark["label"], "points": comparaison}


def compute_holding_price_history(db: Session, holding_id: int, user_id: int) -> dict | None:
    """Performance historique du titre/fonds lui-même (indépendante de la position de
    l'utilisateur) : série de prix + volatilité annualisée + max drawdown. Retourne
    `None` si la ligne n'est pas trouvée ou si aucune donnée n'est disponible (ex.
    private equity, obligation).

    Adressé par `holding_id`, pas par ticker (revu le 14/09/2026) : deux lignes
    peuvent désormais partager un ticker (une par compte) — seul l'id désigne sans
    ambiguïté "de quelle ligne on parle". `user_id` (Milestone 2a) : seulement pour
    vérifier que CETTE ligne appartient bien à l'appelant — le résultat lui-même
    reste une donnée de marché publique (partagée par toute ligne du même ticker).

    **Plus de cache JSON dédié** (`cle_historique_ligne`, backlog § AB.2). Il existait
    parce que chaque ouverture de la fiche retéléchargeait tout l'historique
    (`period="max"`, plusieurs secondes) ; la série vit désormais dans
    `cours_historique`, partagée avec l'historique du portefeuille et la comparaison à
    un indice. Ce qui reste ici — une volatilité et un drawdown sur une série déjà en
    mémoire — se recalcule en quelques millisecondes. Garder un second cache par-dessus
    n'aurait fait que dupliquer la même donnée sous une deuxième forme, avec sa propre
    expiration à faire coïncider : c'est précisément la désynchronisation que ce lot
    supprime."""
    return _compute_holding_price_history(db, holding_id, user_id)


def _compute_holding_price_history(db: Session, holding_id: int, user_id: int) -> dict | None:
    holding = db.query(Holding).filter(Holding.id == holding_id, Holding.user_id == user_id).first()
    if holding is None:
        return None

    # CRYPTO n'a plus de ticker Yahoo à résoudre depuis le 15/09/2026 (cf.
    # `coinmarketcap_service`) — CoinMarketCap ne fournit pas d'historique sur son
    # plan gratuit, donc pas de courbe de prix pour une crypto pour l'instant
    # (`None`, jamais une donnée d'un titre sans rapport comme avant ce correctif).
    if holding.type_actif == "CRYPTO":
        return None

    ticker_resolu = market_data_service.resolve_ticker(db, holding.ticker, holding.type_actif)
    if ticker_resolu is None:
        return None

    # Même série que celle qu'utilise l'historique du portefeuille (backlog § AB.2) :
    # les deux écrans affichaient la même donnée de marché en la téléchargeant chacun
    # de son côté. Volatilité et drawdown restent calculés ici, sur place — ce sont
    # quelques millisecondes sur une série déjà en mémoire.
    series = cours_service.serie_en_euros(db, ticker_resolu)
    if len(series) < 2:
        return None

    prices = [p for _, p in series]
    returns = [(prices[i] / prices[i - 1] - 1) for i in range(1, len(prices)) if prices[i - 1] > 0]

    volatilite_annualisee_pct = None
    if len(returns) >= 2:
        mean = sum(returns) / len(returns)
        variance = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
        volatilite_annualisee_pct = (variance**0.5) * (52**0.5) * 100

    peak = prices[0]
    max_drawdown = 0.0
    for p in prices:
        peak = max(peak, p)
        if peak > 0:
            max_drawdown = min(max_drawdown, (p - peak) / peak)

    return {
        "points": [{"date": d.date().isoformat(), "prix": round(p, 4)} for d, p in series],
        "volatilite_annualisee_pct": round(volatilite_annualisee_pct, 2) if volatilite_annualisee_pct is not None else None,
        "max_drawdown_pct": round(max_drawdown * 100, 2),
    }
