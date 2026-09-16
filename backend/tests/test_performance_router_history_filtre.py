"""Verrouille les paramètres de filtre (`type_actif`, `compte_id`, `etablissement_id`)
de `GET /api/performance/history` (graphique filtrable de l'écran Analyse, retour
utilisateur du 13/09/2026)."""

from datetime import datetime

import yfinance as yf

from app.models import Compte, Etablissement, Holding
from app.services import historical_performance_service, immobilier_service
from app.services.portfolio_reconstruction import rebuild_holdings

from .conftest import ID_UTILISATEUR_TEST, make_transaction
from .test_historical_performance_service import _FauxTickerAvecHistorique


def _preparer_deux_positions(db, monkeypatch):
    """AAA (STOCK) et BBB (CRYPTO), chacune sur son propre compte/établissement,
    avec un prix « live » distinct pour détecter toute contamination croisée.

    Le compte est stampé sur la TRANSACTION avant `rebuild_holdings` (revu le
    14/09/2026, comme le ferait un import réel via `routers/transactions.py`) —
    pas posé après coup directement sur `Holding` : depuis ce lot, le filtre par
    compte de `/api/performance/history` résout les positions via
    `Transaction.compte_id`, `Holding.compte_id` n'en étant qu'un reflet."""
    etablissement = Etablissement(user_id=ID_UTILISATEUR_TEST, nom="Établissement Test")
    db.add(etablissement)
    db.commit()
    compte_aaa = Compte(user_id=ID_UTILISATEUR_TEST, nom="Compte AAA", etablissement_id=etablissement.id)
    compte_bbb = Compte(user_id=ID_UTILISATEUR_TEST, nom="Compte BBB", etablissement_id=None)
    db.add_all([compte_aaa, compte_bbb])
    db.commit()

    make_transaction(
        db, transaction_id="t1", symbol="AAA", shares=10.0, amount=-1000.0, datetime_utc=datetime(2024, 1, 1), compte_id=compte_aaa.id
    )
    make_transaction(
        db,
        transaction_id="t2",
        symbol="BBB",
        shares=5.0,
        amount=-500.0,
        asset_class="CRYPTO",
        datetime_utc=datetime(2024, 1, 1),
        compte_id=compte_bbb.id,
    )
    rebuild_holdings(db, ID_UTILISATEUR_TEST)

    db.query(Holding).filter(Holding.ticker == "AAA", Holding.user_id == ID_UTILISATEUR_TEST).update({"type_actif": "STOCK"})
    db.query(Holding).filter(Holding.ticker == "BBB", Holding.user_id == ID_UTILISATEUR_TEST).update({"type_actif": "CRYPTO"})
    db.commit()

    monkeypatch.setattr(historical_performance_service.market_data_service, "resolve_ticker", lambda *a, **k: "RESOLVED")
    monkeypatch.setattr(yf, "Ticker", _FauxTickerAvecHistorique)
    return etablissement, compte_aaa, compte_bbb


def test_sans_filtre_comportement_inchange(client, db, monkeypatch):
    _preparer_deux_positions(db, monkeypatch)

    reponse = client.get("/api/performance/history")

    assert reponse.status_code == 200
    assert len(reponse.json()["points"]) > 0


def test_filtre_par_type_actif(client, db, monkeypatch):
    _preparer_deux_positions(db, monkeypatch)

    reponse = client.get("/api/performance/history?type_actif=STOCK")

    assert reponse.status_code == 200
    dernier = reponse.json()["points"][-1]
    assert dernier["valeur_portefeuille"] == 1000.0  # 10 x 100 (prix simulé), AAA seul


def test_filtre_par_compte_id(client, db, monkeypatch):
    _etablissement, compte_aaa, _compte_bbb = _preparer_deux_positions(db, monkeypatch)

    reponse = client.get(f"/api/performance/history?compte_id={compte_aaa.id}")

    assert reponse.status_code == 200
    assert reponse.json()["points"][-1]["valeur_portefeuille"] == 1000.0


def test_filtre_par_etablissement_id(client, db, monkeypatch):
    etablissement, _compte_aaa, _compte_bbb = _preparer_deux_positions(db, monkeypatch)

    reponse = client.get(f"/api/performance/history?etablissement_id={etablissement.id}")

    assert reponse.status_code == 200
    # Seul compte_aaa est rattaché à cet établissement -> AAA seul (BBB est sur un
    # compte sans établissement).
    assert reponse.json()["points"][-1]["valeur_portefeuille"] == 1000.0


def test_compte_id_et_etablissement_id_ensemble_est_refuse(client, db, monkeypatch):
    etablissement, compte_aaa, _compte_bbb = _preparer_deux_positions(db, monkeypatch)

    reponse = client.get(f"/api/performance/history?compte_id={compte_aaa.id}&etablissement_id={etablissement.id}")

    assert reponse.status_code == 400


def test_filtre_combine_type_actif_et_compte(client, db, monkeypatch):
    """`type_actif` et `compte_id` restent combinables entre eux (ET logique) — seule
    la combinaison compte/établissement est refusée."""
    _etablissement, compte_aaa, _compte_bbb = _preparer_deux_positions(db, monkeypatch)

    reponse = client.get(f"/api/performance/history?type_actif=CRYPTO&compte_id={compte_aaa.id}")

    # AAA est STOCK, pas CRYPTO : aucun symbole ne satisfait les deux à la fois.
    assert reponse.status_code == 200
    assert reponse.json()["points"] == []


def test_filtre_sans_aucune_position_correspondante_renvoie_une_serie_vide(client, db, monkeypatch):
    _preparer_deux_positions(db, monkeypatch)

    reponse = client.get("/api/performance/history?type_actif=BOND")

    assert reponse.status_code == 200
    assert reponse.json()["points"] == []


def test_filtre_par_type_actif_manuel_selectionne_desormais_le_per(client, db, monkeypatch):
    """Correctif du 16/09/2026 (retour utilisateur : « je ne peux pas sélectionner
    le PER »/« il faut pouvoir sélectionner tous les types de compte ») — un type
    `TYPES_ACTIF_PATRIMOINE_MANUEL` est désormais un filtre valide ici, alors qu'il
    ne renvoyait jusqu'ici qu'une série vide (le grand livre de transactions filtré
    par `historical_performance_service` ne connaît aucune ligne manuelle)."""
    _preparer_deux_positions(db, monkeypatch)
    per = Holding(user_id=ID_UTILISATEUR_TEST, ticker="PER1", nom="PER", quantite=1.0, type_actif="PENSION")
    db.add(per)
    db.commit()
    db.refresh(per)
    immobilier_service.enregistrer_point_historique(db, per.id, 50000.0, datetime(2024, 1, 1))

    reponse = client.get("/api/performance/history?type_actif=PENSION")

    assert reponse.status_code == 200
    points = reponse.json()["points"]
    assert points and points[-1]["valeur_portefeuille"] == 50000.0


def test_sans_filtre_inclut_desormais_la_part_manuelle(client, db, monkeypatch):
    """La portée de `/api/performance/history` s'élargit : sans filtre, le total
    combine désormais financier + manuel (cf. docstring de
    `patrimoine_history_service.compute_portfolio_history_filtre`) — cohérent avec
    le fait qu'un type manuel devienne sélectionnable individuellement (choisir
    « Tout » puis « PER » ne doit jamais faire apparaître un montant absent du
    total non filtré)."""
    _preparer_deux_positions(db, monkeypatch)
    per = Holding(user_id=ID_UTILISATEUR_TEST, ticker="PER1", nom="PER", quantite=1.0, type_actif="PENSION")
    db.add(per)
    db.commit()
    db.refresh(per)
    immobilier_service.enregistrer_point_historique(db, per.id, 50000.0, datetime(2024, 1, 1))

    valeur_bbb = client.get("/api/performance/history?type_actif=CRYPTO").json()["points"][-1]["valeur_portefeuille"]
    dernier = client.get("/api/performance/history").json()["points"][-1]
    assert dernier["valeur_portefeuille"] == 1000.0 + valeur_bbb + 50000.0
