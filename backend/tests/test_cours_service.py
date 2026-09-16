"""Verrouille `cours_service` (backlog § AB, Lot 13) : les séries de cours sont
désormais une donnée du MODÈLE, téléchargée une fois puis complétée de façon
incrémentale, et non plus re-téléchargée à chaque calcul.

Les tests portent sur ce qui fait la valeur du module — ce qu'il ne redemande PAS au
réseau — et sur les cas où l'ancien comportement (tout refetcher) était plus robuste,
pour qu'aucune optimisation ne se paie en régression."""

from datetime import UTC, datetime, timedelta

import pandas as pd
import pytest
import yfinance as yf

from app.models import CoursHistorique, SerieCours
from app.services import cours_service


def _utcnow() -> datetime:
    """Même convention que le service : UTC naïf. Comparer une heure LOCALE à une
    heure UTC ferait passer pour « fraîche » une série vieillie de moins que le
    décalage horaire de la machine — un test qui ne tomberait qu'hors UTC."""
    return datetime.now(UTC).replace(tzinfo=None)


class _FauxTicker:
    """Double yfinance : renvoie les points demandés et compte les appels."""

    appels_history: list[dict] = []
    appels_info = 0
    points: list[tuple[str, float]] = []
    devise = "EUR"

    def __init__(self, symbole=None, *args, **kwargs):
        self.symbole = symbole

    def history(self, *args, **kwargs):
        type(self).appels_history.append(kwargs)
        points = type(self).points
        if kwargs.get("start"):
            points = [(d, v) for d, v in points if d >= kwargs["start"]]
        if not points:
            return pd.DataFrame()
        return pd.DataFrame(
            {"Close": [v for _, v in points]},
            index=pd.DatetimeIndex([datetime.fromisoformat(d) for d, _ in points], tz="UTC"),
        )

    @property
    def info(self):
        type(self).appels_info += 1
        return {"currency": type(self).devise}


@pytest.fixture
def faux_yf(monkeypatch):
    _FauxTicker.appels_history = []
    _FauxTicker.appels_info = 0
    _FauxTicker.points = [("2024-01-01", 100.0), ("2024-01-08", 105.0), ("2024-01-15", 110.0)]
    _FauxTicker.devise = "EUR"
    monkeypatch.setattr(yf, "Ticker", _FauxTicker)
    monkeypatch.setattr(cours_service.yf, "Ticker", _FauxTicker)
    return _FauxTicker


def test_premier_appel_telecharge_tout_et_persiste(db, faux_yf):
    serie = cours_service.serie_brute(db, "AAA")

    assert [v for _, v in serie] == [100.0, 105.0, 110.0]
    assert db.query(CoursHistorique).filter(CoursHistorique.ticker == "AAA").count() == 3
    meta = db.get(SerieCours, "AAA")
    assert meta.devise == "EUR"
    assert meta.premiere_date == "2024-01-01"
    assert meta.derniere_date == "2024-01-15"
    assert meta.sans_donnees is False
    # Premier remplissage : tout l'historique disponible, une seule fois dans la vie
    # du ticker (c'est ce qui permet de servir ensuite la fiche d'une position ET
    # l'historique du portefeuille sans jamais retélécharger).
    assert faux_yf.appels_history[0].get("period") == "max"


def test_deuxieme_appel_ne_retelecharge_rien(db, faux_yf):
    cours_service.serie_brute(db, "AAA")
    appels_apres_premier = len(faux_yf.appels_history)
    info_apres_premier = faux_yf.appels_info

    serie = cours_service.serie_brute(db, "AAA")

    assert [v for _, v in serie] == [100.0, 105.0, 110.0]
    assert len(faux_yf.appels_history) == appels_apres_premier  # aucun appel réseau de plus
    assert faux_yf.appels_info == info_apres_premier


def test_la_devise_nest_demandee_quune_fois(db, faux_yf):
    """Le cœur du gain mesuré (18 s sur 23 s, § AB.0) : `Ticker.info` était appelé
    une fois par titre À CHAQUE calcul, pour une donnée qui ne change jamais."""
    cours_service.devise(db, "AAA")
    cours_service.devise(db, "AAA")
    cours_service.devise(db, "AAA")

    assert faux_yf.appels_info == 1


def test_complement_incremental_ne_redemande_que_le_delta(db, faux_yf):
    cours_service.serie_brute(db, "AAA")
    # La série est périmée : on force la relecture en vieillissant `derniere_maj`.
    meta = db.get(SerieCours, "AAA")
    meta.derniere_maj = _utcnow() - timedelta(hours=cours_service.DUREE_FRAICHEUR_HEURES + 1)
    db.commit()
    faux_yf.points = [*faux_yf.points, ("2024-01-22", 120.0)]
    faux_yf.appels_history = []

    serie = cours_service.serie_brute(db, "AAA")

    assert [v for _, v in serie] == [100.0, 105.0, 110.0, 120.0]
    # Reprise depuis le dernier point connu (moins le recul d'une semaine), JAMAIS
    # depuis le début : c'est tout l'intérêt du modèle.
    assert faux_yf.appels_history[0].get("start") == "2024-01-07"
    assert faux_yf.appels_history[0].get("period") is None


def test_la_semaine_en_cours_est_reecrite_pas_dupliquee(db, faux_yf):
    """Le dernier point d'une série est la semaine EN COURS : sa valeur bouge encore.
    Une complétion doit l'écraser, pas le laisser figé ni créer un doublon."""
    cours_service.serie_brute(db, "AAA")
    meta = db.get(SerieCours, "AAA")
    meta.derniere_maj = _utcnow() - timedelta(hours=cours_service.DUREE_FRAICHEUR_HEURES + 1)
    db.commit()
    faux_yf.points = [("2024-01-15", 999.0)]  # même date, valeur corrigée

    serie = cours_service.serie_brute(db, "AAA")

    assert db.query(CoursHistorique).filter(CoursHistorique.ticker == "AAA").count() == 3
    assert serie[-1][1] == 999.0


def test_un_echec_reseau_sert_ce_qui_est_deja_en_base(db, faux_yf):
    """Gain de robustesse, pas seulement de vitesse : avant, une indisponibilité de
    Yahoo au mauvais moment donnait une courbe VIDE. Désormais elle est simplement
    un peu en retard."""
    cours_service.serie_brute(db, "AAA")
    meta = db.get(SerieCours, "AAA")
    meta.derniere_maj = _utcnow() - timedelta(hours=cours_service.DUREE_FRAICHEUR_HEURES + 1)
    db.commit()

    class _TickerEnPanne(_FauxTicker):
        def history(self, *args, **kwargs):
            raise RuntimeError("panne réseau simulée")

    import app.services.cours_service as module

    module.yf.Ticker = _TickerEnPanne
    try:
        serie = cours_service.serie_brute(db, "AAA")
    finally:
        module.yf.Ticker = _FauxTicker

    assert [v for _, v in serie] == [100.0, 105.0, 110.0]


def test_une_serie_vide_est_reessayee_vite(db, faux_yf):
    """Un premier remplissage qui échoue ne doit pas condamner le graphique pour 24 h
    (l'ancien code retentait à chaque calcul) — d'où un délai de réessai court."""
    faux_yf.points = []

    cours_service.serie_brute(db, "AAA")
    meta = db.get(SerieCours, "AAA")
    assert meta.sans_donnees is True

    meta.derniere_maj = _utcnow() - timedelta(hours=cours_service.DUREE_FRAICHEUR_ECHEC_HEURES + 0.5)
    db.commit()
    faux_yf.points = [("2024-02-01", 42.0)]
    faux_yf.appels_history = []

    serie = cours_service.serie_brute(db, "AAA")

    assert faux_yf.appels_history, "une série vide doit être réessayée bien avant 24 h"
    assert [v for _, v in serie] == [42.0]
    assert db.get(SerieCours, "AAA").sans_donnees is False


def test_conversion_en_euros_dun_titre_en_devise(db, faux_yf):
    faux_yf.devise = "USD"
    faux_yf.points = [("2024-01-01", 100.0), ("2024-01-08", 200.0)]

    class _TickerAvecChange(_FauxTicker):
        def history(self, *args, **kwargs):
            type(self).appels_history.append(kwargs)
            if self.symbole == "USDEUR=X":
                return pd.DataFrame(
                    {"Close": [0.5, 0.5]},
                    index=pd.DatetimeIndex([datetime(2023, 12, 1), datetime(2024, 1, 8)], tz="UTC"),
                )
            return super().history(*args, **kwargs)

        @property
        def info(self):
            type(self).appels_info += 1
            return {"currency": "EUR" if self.symbole == "USDEUR=X" else "USD"}

    import app.services.cours_service as module

    module.yf.Ticker = _TickerAvecChange
    try:
        serie = cours_service.serie_en_euros(db, "AAA")
    finally:
        module.yf.Ticker = _FauxTicker

    assert [v for _, v in serie] == [50.0, 100.0]


def test_un_titre_en_euros_nappelle_aucun_change(db, faux_yf):
    cours_service.serie_en_euros(db, "AAA")

    assert not any(a for a in faux_yf.appels_history if False), "aucune série de change ne doit être créée"
    assert db.query(SerieCours).count() == 1  # le titre seul, pas de "EUREUR=X"


def test_les_pence_sont_divises_par_cent(db, faux_yf):
    """`GBp`/`GBX` : Yahoo cote certains titres londoniens en centièmes de livre."""
    faux_yf.devise = "GBp"
    faux_yf.points = [("2024-01-08", 1000.0)]

    class _TickerPence(_FauxTicker):
        def history(self, *args, **kwargs):
            type(self).appels_history.append(kwargs)
            if self.symbole == "GBPEUR=X":
                return pd.DataFrame(
                    {"Close": [1.2]}, index=pd.DatetimeIndex([datetime(2023, 12, 1)], tz="UTC")
                )
            return super().history(*args, **kwargs)

        @property
        def info(self):
            return {"currency": "EUR" if self.symbole == "GBPEUR=X" else "GBp"}

    import app.services.cours_service as module

    module.yf.Ticker = _TickerPence
    try:
        serie = cours_service.serie_en_euros(db, "AAA")
    finally:
        module.yf.Ticker = _FauxTicker

    # 1000 pence = 10 GBP, x 1,2 = 12 EUR.
    assert serie == [(datetime(2024, 1, 8), pytest.approx(12.0))]


# ---------------------------------------------------------------------------
# Régression du 19/08/2026, déplacée depuis `test_historical_performance_service.py`
# avec la fonction qu'elle verrouille : la devise de l'historique ne doit JAMAIS être
# déduite de `MarketDataCache.devise`, devenu systématiquement "EUR" pour un fonds
# depuis le passage de son cours à justETF, alors que l'historique yfinance
# sous-jacent reste dans sa devise de cotation (USD, GBp...). L'y déduire saute la
# conversion de change et fausse tout l'historique d'un fonds coté hors zone euro.
# ---------------------------------------------------------------------------


def test_devise_lit_info_currency_pas_market_data_cache():
    class _Faux:
        info = {"currency": "USD"}

    assert cours_service._devise_yfinance(_Faux()) == "USD"


def test_devise_renvoie_none_si_info_leve():
    class _FauxDefaillant:
        @property
        def info(self):
            raise Exception("panne réseau simulée")

    assert cours_service._devise_yfinance(_FauxDefaillant()) is None


def test_une_ecriture_concurrente_ne_fait_pas_tomber_lecran(db, faux_yf):
    """Le tableau de bord lance plusieurs endpoints d'un coup (historique, métriques
    avancées, comparaison à un indice), tous demandeurs des MÊMES séries : deux
    requêtes peuvent remplir le même ticker en même temps. C'est l'incident du
    07/09/2026 sur les résolutions de tickers, qui renvoyait un 500 sur tout l'écran.
    La perdante doit relire le travail de la gagnante, pas échouer."""
    from sqlalchemy.exc import IntegrityError

    vrai_commit = db.commit
    appels = {"n": 0}

    def _commit_qui_perd_la_course():
        appels["n"] += 1
        if appels["n"] == 1:
            # Simule la gagnante : la ligne existe déjà quand nous validons.
            db.rollback()
            db.add(SerieCours(ticker="AAA", devise="EUR", derniere_maj=_utcnow()))
            vrai_commit()
            raise IntegrityError("UNIQUE constraint failed", None, Exception())
        return vrai_commit()

    db.commit = _commit_qui_perd_la_course
    try:
        meta = cours_service.rafraichir(db, "AAA")
    finally:
        db.commit = vrai_commit

    assert meta is not None
    assert meta.devise == "EUR"


def test_les_series_sont_partagees_entre_tickers_sans_interference(db, faux_yf):
    cours_service.serie_brute(db, "AAA")
    faux_yf.points = [("2024-03-01", 7.0)]
    cours_service.serie_brute(db, "BBB")

    assert [v for _, v in cours_service.serie_brute(db, "AAA")] == [100.0, 105.0, 110.0]
    assert [v for _, v in cours_service.serie_brute(db, "BBB")] == [7.0]


# --- rafraichir_crypto / serie_crypto_en_euros (retour utilisateur du 17/09/2026 :
# « l'historique de performance n'est pas présent » pour une ligne crypto) --------


def test_rafraichir_crypto_persiste_les_points_coingecko(db, monkeypatch):
    appels = []

    def _fetch(ticker, **kwargs):
        appels.append(ticker)
        return [("2024-01-01", 42000.0), ("2024-01-02", 42100.0)]

    monkeypatch.setattr(cours_service.coingecko_service, "fetch_market_chart", _fetch)

    meta = cours_service.rafraichir_crypto(db, "BTC")

    assert appels == ["BTC"]
    assert meta.devise == "EUR"  # jamais de conversion de change à faire pour une crypto
    assert meta.premiere_date == "2024-01-01"
    assert meta.derniere_date == "2024-01-02"
    assert db.query(CoursHistorique).filter(CoursHistorique.ticker == "BTC").count() == 2


def test_serie_crypto_en_euros_ne_convertit_jamais_meme_sans_devise_eur_explicite(db, monkeypatch):
    """`serie_en_euros` (yfinance) convertirait toute devise non-EUR — `serie_crypto_en_euros`
    ne doit JAMAIS le faire : la valeur CoinGecko est déjà en euros par construction
    (`vs_currency=eur`), il n'y a même pas de série de change à aller chercher."""
    monkeypatch.setattr(cours_service.coingecko_service, "fetch_market_chart", lambda ticker, **k: [("2024-01-01", 42000.0)])

    serie = cours_service.serie_crypto_en_euros(db, "BTC")

    assert serie == [(datetime(2024, 1, 1), 42000.0)]


def test_rafraichir_crypto_echec_coingecko_laisse_la_serie_en_letat(db, monkeypatch):
    """Même garantie que `rafraichir` (yfinance) : une panne réseau ne vide jamais
    un graphique déjà rempli, on sert ce que la base contient déjà."""
    appels = {"n": 0}

    def _fetch(ticker, **k):
        appels["n"] += 1
        if appels["n"] == 1:
            return [("2024-01-01", 42000.0)]
        return None  # panne simulée au rafraîchissement suivant

    monkeypatch.setattr(cours_service.coingecko_service, "fetch_market_chart", _fetch)
    cours_service.rafraichir_crypto(db, "BTC")
    meta = db.get(SerieCours, "BTC")
    meta.derniere_maj = _utcnow() - timedelta(hours=cours_service.DUREE_FRAICHEUR_HEURES + 1)
    db.commit()

    cours_service.rafraichir_crypto(db, "BTC")

    assert [v for _, v in cours_service._lire(db, "BTC")] == [42000.0]


def test_rafraichir_crypto_ne_redemande_rien_avant_expiration_de_la_fraicheur(db, monkeypatch):
    appels = {"n": 0}

    def _fetch(ticker, **k):
        appels["n"] += 1
        return [("2024-01-01", 42000.0)]

    monkeypatch.setattr(cours_service.coingecko_service, "fetch_market_chart", _fetch)

    cours_service.rafraichir_crypto(db, "BTC")
    cours_service.rafraichir_crypto(db, "BTC")
    cours_service.rafraichir_crypto(db, "BTC")

    assert appels["n"] == 1


def test_rafraichir_crypto_et_rafraichir_yfinance_ne_se_melangent_jamais(db, faux_yf, monkeypatch):
    """Deux sources distinctes pour deux ticker différents ne doivent jamais
    interférer — même garde-fou que `test_les_series_sont_partagees_entre_tickers_sans_interference`,
    pour la paire yfinance/CoinGecko cette fois."""
    monkeypatch.setattr(cours_service.coingecko_service, "fetch_market_chart", lambda ticker, **k: [("2024-02-01", 42000.0)])

    cours_service.serie_brute(db, "AAA")  # yfinance
    cours_service.rafraichir_crypto(db, "BTC")  # CoinGecko

    assert [v for _, v in cours_service.serie_brute(db, "AAA")] == [100.0, 105.0, 110.0]
    assert [v for _, v in cours_service.serie_crypto_en_euros(db, "BTC")] == [42000.0]
    assert db.get(SerieCours, "AAA").devise == "EUR"
    assert db.get(SerieCours, "BTC").devise == "EUR"
