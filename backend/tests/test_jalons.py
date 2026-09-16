"""Verrouille `services/jalons_service.py` et `routers/jalons.py` (backlog
§§ AG.3/AG.4) : évaluation des trois jalons, persistance de la célébration
(jamais rejouée), isolation entre comptes de connexion (IDOR)."""

from datetime import datetime, timedelta

from app.models import User

from .conftest import ID_UTILISATEUR_TEST, basculer_utilisateur, make_transaction


def test_aucun_jalon_atteint_par_defaut(client):
    reponse = client.get("/api/jalons/")
    assert reponse.status_code == 200
    corps = reponse.json()
    assert len(corps) == 3
    assert all(j["atteint"] is False for j in corps)
    assert all(j["nouveau"] is False for j in corps)


def test_premier_import_atteint_des_qu_une_transaction_existe(client, db):
    # `date_atteint` doit refléter QUAND la transaction a été importée
    # (`created_at`, l'horodatage de la ligne en base), pas sa date financière
    # propre (`date`/`datetime_utc`, ici 2024-01-01 par défaut) — les deux peuvent
    # diverger largement pour un import tardif d'un historique ancien.
    make_transaction(db, created_at=datetime(2025, 6, 1))

    corps = client.get("/api/jalons/").json()
    jalon = next(j for j in corps if j["id"] == "premier_import")
    assert jalon["atteint"] is True
    assert jalon["date_atteint"] == "2025-06-01"
    assert jalon["nouveau"] is True  # jamais encore célébré


def test_trois_mois_et_un_an_de_suivi_selon_l_anciennete_du_compte(client, db):
    utilisateur = db.get(User, ID_UTILISATEUR_TEST)
    utilisateur.created_at = datetime.now() - timedelta(days=100)
    db.commit()

    corps = client.get("/api/jalons/").json()
    trois_mois = next(j for j in corps if j["id"] == "trois_mois_suivi")
    un_an = next(j for j in corps if j["id"] == "un_an_suivi")
    assert trois_mois["atteint"] is True
    assert un_an["atteint"] is False


def test_marquer_celebre_rend_le_jalon_non_nouveau_sans_en_changer_l_etat(client, db):
    make_transaction(db)
    avant = client.get("/api/jalons/").json()
    assert next(j for j in avant if j["id"] == "premier_import")["nouveau"] is True

    reponse = client.post("/api/jalons/premier_import/marquer-celebre")
    assert reponse.status_code == 204

    apres = client.get("/api/jalons/").json()
    jalon = next(j for j in apres if j["id"] == "premier_import")
    assert jalon["atteint"] is True  # inchangé
    assert jalon["nouveau"] is False  # ne se répète plus


def test_marquer_celebre_jalon_inconnu_404(client):
    reponse = client.post("/api/jalons/jalon-qui-n-existe-pas/marquer-celebre")
    assert reponse.status_code == 404


def test_marquer_celebre_est_idempotent(client, db):
    make_transaction(db)
    assert client.post("/api/jalons/premier_import/marquer-celebre").status_code == 204
    assert client.post("/api/jalons/premier_import/marquer-celebre").status_code == 204


def test_jalons_isoles_entre_comptes(client, db):
    """IDOR : les transactions et la célébration d'un compte ne doivent jamais
    influencer les jalons d'un autre compte de connexion."""
    make_transaction(db)
    client.post("/api/jalons/premier_import/marquer-celebre")

    basculer_utilisateur(db, user_id=2, username="autre")
    corps = client.get("/api/jalons/").json()
    jalon = next(j for j in corps if j["id"] == "premier_import")
    assert jalon["atteint"] is False
    assert jalon["nouveau"] is False
