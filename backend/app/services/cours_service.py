"""Séries de cours hebdomadaires, adossées à la base (backlog § AB, Lot 13).

Ce module est la SEULE porte d'entrée vers l'historique de cours d'un ticker. Il
remplace trois chemins qui allaient chacun chercher la même donnée de marché sur le
réseau, de leur côté, à chaque calcul : l'historique du portefeuille, la fiche d'une
position, et la comparaison à un indice.

── Pourquoi (mesure du 14/09/2026, sur une copie de la base réelle) ──────────────
Un calcul à froid de l'historique du portefeuille prenait 23,4 s, dont :
  • 22,9 s de réseau yfinance (98 %),
  •  0,4 s de calcul local (2 %),
  •  0,09 s pour rejouer les 4 059 transactions du grand livre (SQLite).
Et dans ces 22,9 s, 18,0 s partaient dans `Ticker.info` — l'appel le plus lourd de
la librairie — appelé une fois par titre uniquement pour lire sa DEVISE de cotation,
une chaîne de trois lettres qui ne change jamais.

Le défaut n'était donc pas le moteur de base de données (0,09 s sur tout le grand
livre), mais l'absence de MODÈLE pour la donnée la plus coûteuse à acquérir et la
plus stable qui soit : *un cours de clôture passé ne change jamais*. Elle ne vivait
qu'en transit, ou noyée dans des blobs JSON d'agrégats dérivés expirant toutes les
24 h (`historique_cache`).

── Ce que ce module garantit ────────────────────────────────────────────────────
  • **Un seul téléchargement complet par ticker**, jamais refait : les appels
    suivants ne demandent que les semaines écoulées depuis le dernier point connu.
  • **La devise lue une seule fois** par ticker, puis relue en base.
  • **Partage total** entre usages et entre foyers : une série de cours est une
    donnée de marché publique, identique pour tout le monde (même doctrine que
    `historique_cache.cle_historique_ligne`/`cle_historique_benchmark`, mais portée
    par le modèle relationnel plutôt que par un blob JSON par usage).
  • **Les taux de change sont des séries comme les autres** : `yfinance` les expose
    en tickers ordinaires (`USDEUR=X`), ils passent donc par le même chemin, sans
    table ni mécanisme dédiés (§ AB.3).
  • **Une panne réseau ne vide plus un graphique** : à défaut de pouvoir compléter,
    on sert ce que la base contient déjà. Avant, une indisponibilité de Yahoo au
    mauvais moment donnait une courbe vide.

`rafraichir_crypto`/`serie_crypto_en_euros` (retour utilisateur du 17/09/2026) : même
table, même modèle de fraîcheur/reprise, mais source CoinGecko plutôt que yfinance
pour une ligne `CRYPTO` — cf. leurs docstrings et celle de `coingecko_service` pour le
détail. `rafraichir`/`serie_en_euros` restent le chemin yfinance, inchangé.
"""

import bisect
import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pandas as pd
import yfinance as yf
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models import CoursHistorique, SerieCours
from . import coingecko_service

logger = logging.getLogger("patrimoine.cours")

TimeSeries = list[tuple[datetime, float]]

# Au-delà de ce délai, la série est complétée depuis son dernier point connu. Les
# points passés ne sont jamais redemandés : ils ne changent pas. Seule la semaine en
# cours est réécrite, puisqu'elle, elle bouge encore. 24 h est la même cadence que le
# reste des caches de marché (`historique_cache.DUREE_VALIDITE_HEURES`), et reste
# plus fine que la donnée elle-même (hebdomadaire).
DUREE_FRAICHEUR_HEURES = 24

# Une série qu'on n'a PAS réussi à remplir est réessayée bien plus vite qu'une série
# à jour — même distinction que `market_data_service.DUREE_CACHE_ECHEC_JOURS` pour la
# résolution des tickers. Sans elle, une panne Yahoo au premier remplissage laisserait
# le graphique vide pendant 24 h, là où l'ancien code (qui retentait à chaque calcul)
# se serait rétabli tout seul : ce serait une régression, pas une optimisation.
DUREE_FRAICHEUR_ECHEC_HEURES = 1

# Recul appliqué au point de reprise d'une complétion : on redemande la dernière
# semaine connue plutôt que de repartir strictement après elle. Sans ce recul, une
# série remplie en milieu de semaine garderait à jamais la valeur partielle de cette
# semaine-là — le point existe, donc il ne serait jamais redemandé.
RECUL_REPRISE_JOURS = 8


def _maintenant() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _en_serie(hist: pd.DataFrame) -> list[tuple[str, float]]:
    """DataFrame yfinance -> [(date ISO, clôture)], dans la devise d'origine.

    La date est tronquée au jour : une série hebdomadaire n'a pas d'heure utile, et
    c'est la granularité de comparaison utilisée partout ailleurs (`Transaction.date`,
    points d'historique). `astimezone(UTC)` avant troncature reproduit exactement la
    conversion que faisait `historical_performance_service._history_to_series`."""
    points: list[tuple[str, float]] = []
    for idx, row in hist.iterrows():
        close = row.get("Close")
        if close is None or pd.isna(close):
            continue
        dt = idx.to_pydatetime().astimezone(UTC).replace(tzinfo=None)
        points.append((dt.date().isoformat(), float(close)))
    return points


def _devise_yfinance(ticker_yf) -> str | None:
    """Devise dans laquelle `history()` renvoie ses prix pour ce ticker.

    À ne JAMAIS confondre avec `MarketDataCache.devise` : depuis le passage du cours
    des ETF à justETF, ce champ vaut systématiquement "EUR" pour un fonds, quelle que
    soit la devise réelle de cotation Yahoo de l'historique sous-jacent (`IWDA.L` cote
    en USD, `XSDR.L` en GBp). L'utiliser ici ferait sauter la conversion de change et
    fausserait tout l'historique de ce titre (régression du 19/08/2026)."""
    try:
        return ticker_yf.info.get("currency")
    except Exception:
        return None


def _telecharger(ticker: str, depuis: str | None) -> tuple[list[tuple[str, float]], str | None]:
    """Points hebdomadaires et devise, depuis yfinance. `depuis` absent : tout
    l'historique disponible (`period="max"`), une seule fois dans la vie du ticker —
    c'est ce qui permet ensuite de servir aussi bien la fiche d'une position (qui
    veut tout) que l'historique du portefeuille (qui veut depuis sa première
    transaction) sans jamais retélécharger."""
    try:
        ticker_yf = yf.Ticker(ticker)
        hist = ticker_yf.history(start=depuis, interval="1wk") if depuis else ticker_yf.history(period="max", interval="1wk")
    except Exception:
        logger.warning("cours : échec du téléchargement de %s", ticker, exc_info=True)
        return [], None
    if hist is None or hist.empty:
        return [], None
    return _en_serie(hist), _devise_yfinance(ticker_yf)


def _ecrire(db: Session, ticker: str, points: list[tuple[str, float]]) -> None:
    """Remplace les points à partir de la première date du lot, puis insère le lot.

    Deux requêtes plutôt qu'un `merge()` par point : un premier remplissage
    (`period="max"`) peut porter un millier de points, et mille allers-retours ORM
    coûteraient plus cher que le téléchargement lui-même. Remplacer plutôt
    qu'ignorer les doublons est délibéré : le dernier point d'un lot est la semaine
    EN COURS, dont la valeur doit être écrasée à chaque complétion."""
    if not points:
        return
    debut = min(d for d, _ in points)
    db.query(CoursHistorique).filter(CoursHistorique.ticker == ticker, CoursHistorique.date >= debut).delete(
        synchronize_session=False
    )
    # `dict` sur la date : deux points yfinance tombant le même jour après troncature
    # violeraient la clé primaire (ticker, date). Impossible en hebdomadaire, mais
    # une série jamais vérifiée ne doit pas pouvoir faire tomber un écran entier.
    uniques = dict(points)
    db.bulk_save_objects([CoursHistorique(ticker=ticker, date=d, cloture=v) for d, v in uniques.items()])


def _lire(db: Session, ticker: str) -> TimeSeries:
    lignes = (
        db.query(CoursHistorique.date, CoursHistorique.cloture)
        .filter(CoursHistorique.ticker == ticker)
        .order_by(CoursHistorique.date.asc())
        .all()
    )
    return [(datetime.fromisoformat(d), v) for d, v in lignes]


def _telecharger_crypto(ticker: str, _depuis: str | None) -> tuple[list[tuple[str, float]], str | None]:
    """CoinGecko en source pour une ligne `CRYPTO` (retour utilisateur du
    17/09/2026 : l'historique de performance manquait pour ces lignes, cf. § AE.3
    du backlog, délibérément différé lors du passage à CoinGecko). `depuis` est
    ignoré, contrairement à `_telecharger` (yfinance) : `coingecko_service.fetch_market_chart`
    redemande systématiquement toute la fenêtre disponible (jusqu'à un an sur le
    plan Demo, cf. sa docstring) — CoinGecko ne facture pas significativement plus
    cher une fenêtre large (1 crédit par appel quelle que soit `days`), donc la
    reprise incrémentale de `_telecharger` n'apporterait aucun gain réel ici, pour
    une complexité supplémentaire (endpoint `/market_chart/range` séparé) qui ne
    se justifie pas sur le volume d'un portefeuille personnel. `_ecrire` reste
    idempotent sur un lot qui recouvre des dates déjà connues (remplace, jamais
    de doublon). Toujours "EUR" comme devise : `vs_currency=eur` est demandé
    explicitement à l'API, aucune conversion de change à faire en aval."""
    points = coingecko_service.fetch_market_chart(ticker)
    if points is None:
        return [], None
    return points, "EUR"


def _rafraichir_avec(
    db: Session, ticker: str, forcer: bool, telecharger: Callable[[str, str | None], tuple[list[tuple[str, float]], str | None]]
) -> SerieCours | None:
    """Logique commune à `rafraichir` (yfinance) et `rafraichir_crypto` (CoinGecko)
    — seule la source de téléchargement change, le modèle de fraîcheur/reprise/
    écriture reste identique quelle que soit la source : fraîcheur, reprise depuis
    le dernier point connu, écriture, mise à jour des métadonnées, retry sur
    écriture concurrente. Ne lève jamais : un échec réseau laisse la série en
    l'état, et l'appelant sert ce qui est déjà en base."""
    meta = db.get(SerieCours, ticker)
    if meta is not None and not forcer:
        seuil = DUREE_FRAICHEUR_ECHEC_HEURES if meta.sans_donnees else DUREE_FRAICHEUR_HEURES
        if _maintenant() - meta.derniere_maj < timedelta(hours=seuil):
            return meta

    # Reprise depuis le dernier point connu, jamais depuis le début : c'est tout
    # l'intérêt du modèle. Un titre suivi depuis des années ne redemande que les
    # quelques semaines écoulées depuis la dernière visite. Sans effet pour
    # `_telecharger_crypto`, qui ignore `depuis` (cf. sa docstring).
    depuis = None
    if meta is not None and meta.derniere_date:
        reprise = datetime.fromisoformat(meta.derniere_date) - timedelta(days=RECUL_REPRISE_JOURS)
        depuis = reprise.date().isoformat()

    points, devise = telecharger(ticker, depuis)
    _ecrire(db, ticker, points)

    if meta is None:
        meta = SerieCours(ticker=ticker)
        db.add(meta)
    # La devise n'est relue que si la source vient d'en donner une : une complétion
    # qui ne ramène aucun point (marché fermé, ticker retiré, échec CoinGecko) ne
    # doit pas effacer une devise déjà connue.
    if devise:
        meta.devise = devise
    premiere, derniere = (
        db.query(func.min(CoursHistorique.date), func.max(CoursHistorique.date))
        .filter(CoursHistorique.ticker == ticker)
        .one()
    )
    meta.premiere_date = premiere
    meta.derniere_date = derniere
    meta.sans_donnees = derniere is None
    meta.derniere_maj = _maintenant()
    try:
        db.commit()
    except IntegrityError:
        # Deux requêtes HTTP parallèles peuvent remplir le MÊME ticker en même temps :
        # le tableau de bord lance plusieurs endpoints d'un coup (historique, métriques
        # avancées, comparaison à un indice) et tous ont besoin des mêmes séries.
        # Aucune ne trouve la ligne, toutes deux insèrent, la seconde viole la clé
        # primaire — et l'écran entier tombait alors en 500. C'est exactement l'incident
        # du 07/09/2026 sur les résolutions de tickers, dont
        # `market_data_service._enregistrer_resolution` porte déjà le remède : la
        # gagnante fait autorité, on relit son travail au lieu de réessayer d'écrire.
        # Les deux téléchargeaient la même donnée de marché, elles ne peuvent pas être
        # en désaccord de fond.
        db.rollback()
        logger.info("cours : écriture concurrente sur %s, la série de l'autre requête fait autorité", ticker)
        return db.get(SerieCours, ticker)
    return meta


def rafraichir(db: Session, ticker: str, forcer: bool = False) -> SerieCours | None:
    """Complète la série de `ticker` (source yfinance) si elle est absente ou
    périmée, et renvoie ses métadonnées (devise comprise).

    `forcer` : ignore le délai de fraîcheur (job planifié, § AB.5)."""
    return _rafraichir_avec(db, ticker, forcer, _telecharger)


def rafraichir_crypto(db: Session, ticker: str, forcer: bool = False) -> SerieCours | None:
    """Équivalent de `rafraichir`, source CoinGecko (`_telecharger_crypto`) — pour
    une ligne `Holding.type_actif == "CRYPTO"` UNIQUEMENT (jamais de mélange de
    sources pour un même ticker, même politique que `coingecko_service` pour le
    prix courant)."""
    return _rafraichir_avec(db, ticker, forcer, _telecharger_crypto)


def devise(db: Session, ticker: str) -> str | None:
    """Devise de cotation de `ticker`, lue en base — le remplacement direct des 18 s
    d'appels `Ticker.info` mesurées au § AB.0."""
    meta = rafraichir(db, ticker)
    return meta.devise if meta else None


def serie_brute(db: Session, ticker: str) -> TimeSeries:
    """Série hebdomadaire complète de `ticker`, dans SA devise de cotation."""
    rafraichir(db, ticker)
    return _lire(db, ticker)


def _serie_change(db: Session, devise_source: str) -> TimeSeries:
    """Série du taux `devise_source` -> EUR. Passe par le même chemin que n'importe
    quel autre ticker : `yfinance` expose les changes en tickers ordinaires (§ AB.3).

    `GBp`/`GBX` (pence) : Yahoo cote certains titres londoniens en centièmes de
    livre. Le taux est celui de la livre, divisé par cent."""
    pence = devise_source in ("GBp", "GBX")
    code = "GBP" if pence else devise_source.upper()
    serie = serie_brute(db, f"{code}EUR=X")
    return [(d, v / 100) for d, v in serie] if pence else serie


def _valeur_a(serie: TimeSeries, quand: datetime) -> float | None:
    """Dernière valeur connue à date <= `quand` (série triée croissante).

    Recherche dichotomique, même choix que `historical_performance_service._value_at`
    (LOT 4.6) : la conversion de change appelle cette fonction une fois par point de
    la série convertie, un parcours linéaire rendrait le coût quadratique."""
    idx = bisect.bisect_right(serie, quand, key=lambda point: point[0])
    return serie[idx - 1][1] if idx else None


def serie_en_euros(db: Session, ticker: str) -> TimeSeries:
    """Série hebdomadaire de `ticker`, convertie en euros — le contrat attendu par
    tous les calculs de l'application, qui raisonnent en euros de bout en bout.

    Un point dont le taux de change n'est pas connu à sa date est écarté plutôt que
    laissé dans sa devise d'origine : mélanger des dollars et des euros dans une même
    courbe est pire qu'un trou."""
    meta = rafraichir(db, ticker)
    serie = _lire(db, ticker)
    devise_source = meta.devise if meta else None
    if not serie or not devise_source or devise_source == "EUR":
        return serie

    change = _serie_change(db, devise_source)
    if not change:
        return []
    convertie: TimeSeries = []
    for d, v in serie:
        taux = _valeur_a(change, d)
        if taux is None:
            continue
        convertie.append((d, v * taux))
    return convertie


def serie_crypto_en_euros(db: Session, ticker: str) -> TimeSeries:
    """Équivalent de `serie_en_euros`, source CoinGecko (`rafraichir_crypto`) — pour
    une ligne `Holding.type_actif == "CRYPTO"` UNIQUEMENT. Jamais de conversion de
    change à faire ici, contrairement à `serie_en_euros` : `vs_currency=eur` est
    demandé explicitement à CoinGecko, la série est déjà en euros par construction
    (cf. `coingecko_service.fetch_market_chart`)."""
    rafraichir_crypto(db, ticker)
    return _lire(db, ticker)
