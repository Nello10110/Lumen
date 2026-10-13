"""Verrouille `services/titres_suivis.py` (backlog § BK.2d, carte #85) : un foyer suspendu ne
fait plus rafraîchir ses titres ; un titre qu'un foyer actif détient aussi reste rafraîchi ;
la réactivation du foyer le remet dans le cycle."""

from app.models import MarketDataCache
from app.services import foyer_service, justetf_service, market_data_refresh, scheduler_service, titres_suivis

from .conftest import ID_FOYER_B, ID_FOYER_TEST, attendre_fin_rafraichissement_arriere_plan, creer_foyer, make_holding


def _deux_foyers(db) -> None:
    """Le foyer de test (actif) et le foyer B, ici SUSPENDU."""
    creer_foyer(db, ID_FOYER_B)
    foyer_service.suspendre_foyer(db, ID_FOYER_B)


def test_un_foyer_actif_fait_rafraichir_ses_titres(db):
    make_holding(db, ticker="AAA", type_actif="STOCK")

    assert titres_suivis.titres_a_rafraichir(db) == [("AAA", "STOCK")]


def test_un_foyer_suspendu_ne_fait_plus_rafraichir_ses_titres(db):
    _deux_foyers(db)
    make_holding(db, ticker="AAA", type_actif="STOCK", foyer_id=ID_FOYER_TEST)
    make_holding(db, ticker="BBB", type_actif="FUND", foyer_id=ID_FOYER_B)

    assert titres_suivis.titres_a_rafraichir(db) == [("AAA", "STOCK")]


def test_un_titre_commun_a_un_foyer_actif_reste_rafraichi_une_seule_fois(db):
    _deux_foyers(db)
    make_holding(db, ticker="AAA", type_actif="STOCK", foyer_id=ID_FOYER_TEST)
    make_holding(db, ticker="AAA", type_actif="STOCK", foyer_id=ID_FOYER_B)

    assert titres_suivis.titres_a_rafraichir(db) == [("AAA", "STOCK")]


def test_la_reactivation_du_foyer_remet_ses_titres_dans_le_cycle(db):
    _deux_foyers(db)
    make_holding(db, ticker="BBB", type_actif="FUND", foyer_id=ID_FOYER_B)
    assert titres_suivis.titres_a_rafraichir(db) == []

    foyer_service.reactiver_foyer(db, ID_FOYER_B)

    assert titres_suivis.titres_a_rafraichir(db) == [("BBB", "FUND")]


def test_le_declenchement_manuel_depuis_reglages_ignore_les_titres_d_un_foyer_suspendu(db, monkeypatch):
    _deux_foyers(db)
    make_holding(db, ticker="AAA", type_actif="STOCK", foyer_id=ID_FOYER_TEST)
    make_holding(db, ticker="BBB", type_actif="STOCK", foyer_id=ID_FOYER_B)
    recus = []
    monkeypatch.setattr(
        market_data_refresh,
        "demarrer_rafraichissement",
        lambda items, on_termine=None, forcer_non_cotables=False: recus.append(items),
    )

    scheduler_service.run_job_now(db, scheduler_service.MARKET_DATA_REFRESH)
    attendre_fin_rafraichissement_arriere_plan()

    assert recus == [[("AAA", "STOCK")]]


def test_le_declenchement_manuel_depuis_le_portefeuille_ignore_les_titres_d_un_foyer_suspendu(client, db, monkeypatch):
    _deux_foyers(db)
    make_holding(db, ticker="AAA", type_actif="STOCK", foyer_id=ID_FOYER_TEST)
    make_holding(db, ticker="BBB", type_actif="STOCK", foyer_id=ID_FOYER_B)
    recus = []
    monkeypatch.setattr(
        market_data_refresh,
        "demarrer_rafraichissement",
        lambda items, on_termine=None, forcer_non_cotables=False: recus.append(items) or market_data_refresh.etat_rafraichissement(),
    )

    reponse = client.post("/api/market-data/refresh")

    assert reponse.status_code == 202
    assert recus == [[("AAA", "STOCK")]]


def test_la_composition_justetf_n_est_plus_rafraichie_pour_un_etf_d_un_foyer_suspendu(db, monkeypatch):
    _deux_foyers(db)
    make_holding(db, ticker="IE00B4L5Y983", type_actif="FUND", foyer_id=ID_FOYER_TEST)
    make_holding(db, ticker="IE00BK5BQT80", type_actif="FUND", foyer_id=ID_FOYER_B)
    interroges = []

    def _fiche(isin):
        interroges.append(isin)
        return justetf_service.FicheJustETF(geo_rows=[], sector_rows=[], geo_brut=[], sector_brut=[], description="x")

    monkeypatch.setattr(justetf_service, "fetch_composition", _fiche)

    justetf_service.refresh_all(db)

    assert interroges == ["IE00B4L5Y983"]
    assert db.get(MarketDataCache, "IE00BK5BQT80") is None
