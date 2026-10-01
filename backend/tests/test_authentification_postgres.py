"""L'authentification sous la séparation des foyers de Postgres (backlog § BK.2e) : les routes
`register`, `login`, `logout`, la lecture du jeton de session, la création d'un compte et la ligne de
commande de l'opérateur fonctionnent quand `users`, `auth_tokens` et `access_log_entries` ne se
montrent que sous l'état d'authentification. Chaque requête ouvre sa propre session de base, comme en
production (aucune substitution de `get_db`), avec le rôle applicatif ordinaire.

Postgres uniquement : sous SQLite, la séparation n'existe pas (`test_auth_router.py` couvre le
comportement des routes). Les tests d'intrusion — ce que la base montre quand un filtre manque — sont
dans `test_separation_foyers.py`."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app import cli, database
from app.main import app
from app.models import AccessLogEntry, AuthToken, User
from app.services import auth_service

from .conftest import creer_utilisateur

pytestmark = pytest.mark.skipif(database.EST_SQLITE, reason="sécurité au niveau des lignes : Postgres seulement (§ BI.5)")

MOT_DE_PASSE = "mot-de-passe-solide"


@pytest.fixture
def client(db):
    """Une installation neuve (l'inscription n'est ouverte que tant qu'aucun compte n'existe), et de vraies
    sessions de base. `db` reste la session d'administration du banc, pour relire la base telle qu'elle est."""
    tables = ", ".join(f'"{t.name}"' for t in database.Base.metadata.sorted_tables)
    with database.engine.begin() as connexion:
        connexion.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    with TestClient(app) as test_client:
        yield test_client


def _en_tete(jeton: str) -> dict:
    return {"Authorization": f"Bearer {jeton}"}


def _inscrire(client, username="paul") -> str:
    reponse = client.post("/api/auth/register", json={"username": username, "password": MOT_DE_PASSE})
    assert reponse.status_code == 200, reponse.text
    return reponse.json()["token"]


def _connecter(client, username="paul") -> str:
    reponse = client.post("/api/auth/login", json={"username": username, "password": MOT_DE_PASSE})
    assert reponse.status_code == 200, reponse.text
    return reponse.json()["token"]


def test_inscription_connexion_sessions_et_deconnexion(client, db):
    jeton_inscription = _inscrire(client)
    assert client.get("/api/auth/me", headers=_en_tete(jeton_inscription)).json()["username"] == "paul"
    # L'inscription se referme dès qu'un compte existe — qu'un foyer le voie ou non.
    assert client.post("/api/auth/register", json={"username": "autre", "password": MOT_DE_PASSE}).status_code == 403

    jeton_connexion = _connecter(client)
    sessions = client.get("/api/auth/sessions", headers=_en_tete(jeton_connexion)).json()
    assert len(sessions) == 2
    assert [s["est_courante"] for s in sessions].count(True) == 1

    assert client.post("/api/auth/logout", headers=_en_tete(jeton_connexion)).status_code == 204
    assert client.get("/api/auth/me", headers=_en_tete(jeton_connexion)).status_code == 401
    assert client.get("/api/auth/me", headers=_en_tete(jeton_inscription)).status_code == 200
    # La session ne vit que par son empreinte.
    assert {s.token_hash for s in db.query(AuthToken)} == {auth_service.hacher_jeton(jeton_inscription)}
    assert [e.action for e in db.query(AccessLogEntry).order_by(AccessLogEntry.id)] == ["login", "logout"]


def test_un_identifiant_inconnu_se_journalise_et_se_verrouille(client, db):
    for _ in range(auth_service.SEUIL_TENTATIVES):
        reponse = client.post("/api/auth/login", json={"username": "fantome", "password": "peu importe"})
        assert reponse.status_code == 401
    # Le journal a été écrit (sans compte auquel le rattacher), et le verrouillage le relit.
    assert db.query(AccessLogEntry).filter(AccessLogEntry.username_saisi == "fantome", AccessLogEntry.user_id.is_(None)).count() == 5
    assert client.post("/api/auth/login", json={"username": "fantome", "password": "peu importe"}).status_code == 429


def test_une_mauvaise_connexion_d_un_compte_existant_se_rattache_a_lui(client, db):
    _inscrire(client)
    assert client.post("/api/auth/login", json={"username": "paul", "password": "mauvais"}).status_code == 401
    echec = db.query(AccessLogEntry).filter(AccessLogEntry.resultat == "echec").one()
    assert (echec.username_saisi, echec.raison) == ("paul", "mot_de_passe_incorrect")
    assert echec.user_id == db.query(User).one().id


def test_un_nom_d_utilisateur_pris_dans_un_autre_foyer_est_refuse_proprement(client, db):
    """Le propriétaire ne voit pas les comptes d'un autre foyer : l'unicité du nom ne doit pas en dépendre
    (400 « déjà pris », pas une violation de contrainte)."""
    jeton = _inscrire(client)
    creer_utilisateur(db, 20, "voisin")

    reponse = client.post(
        "/api/auth/household-members", json={"username": "voisin", "password": MOT_DE_PASSE, "role": "membre"}, headers=_en_tete(jeton)
    )

    assert reponse.status_code == 400
    assert db.query(User).filter(User.username == "voisin").count() == 1


def test_le_proprietaire_compte_les_sessions_de_ses_membres_sans_pouvoir_les_couper(client, db):
    jeton = _inscrire(client)
    membre = client.post(
        "/api/auth/household-members", json={"username": "conjoint", "password": MOT_DE_PASSE, "role": "membre"}, headers=_en_tete(jeton)
    ).json()
    jeton_membre = _connecter(client, "conjoint")
    _connecter(client, "conjoint")

    liste = client.get("/api/auth/household-members", headers=_en_tete(jeton)).json()
    assert {m["username"]: m["sessions_actives"] for m in liste} == {"paul": 1, "conjoint": 2}

    # Il ne voit pas la liste des sessions du membre, et n'en révoque aucune : 404, comme une session inconnue.
    id_session_du_membre = client.get("/api/auth/sessions", headers=_en_tete(jeton_membre)).json()[0]["id_session"]
    assert client.delete(f"/api/auth/sessions/{id_session_du_membre}", headers=_en_tete(jeton)).status_code == 404
    assert client.get("/api/auth/me", headers=_en_tete(jeton_membre)).json()["id"] == membre["id"]


def test_la_commande_de_l_operateur_cree_le_compte_et_change_son_mot_de_passe(client, db, monkeypatch):
    """Commande d'exploitation : aucune session, aucune identité — le compte se crée et se retrouve sous l'état
    d'authentification, et sa réinitialisation met fin à ses sessions."""
    jeton_foyer = _inscrire(client)
    mots_de_passe = iter(["premier-mot-de-passe", "second-mot-de-passe"])
    monkeypatch.setattr(cli, "_demander_mot_de_passe", lambda: next(mots_de_passe))

    with database.SessionLocal() as session:
        assert cli.executer(["operateur", "creer", "gardien"], session) == 0
    reponse = client.post("/api/auth/login", json={"username": "gardien", "password": "premier-mot-de-passe"})
    assert reponse.status_code == 200
    jeton_operateur = reponse.json()["token"]
    assert client.get("/api/operateur/foyers", headers=_en_tete(jeton_operateur)).status_code == 200
    # Le propriétaire d'un foyer ne voit pas ce compte, ni ne le rejoint à un foyer.
    assert client.get("/api/operateur/foyers", headers=_en_tete(jeton_foyer)).status_code == 403

    with database.SessionLocal() as session:
        assert cli.executer(["operateur", "mot-de-passe", "gardien"], session) == 0
    assert client.get("/api/auth/me", headers=_en_tete(jeton_operateur)).status_code == 401
    assert client.post("/api/auth/login", json={"username": "gardien", "password": "premier-mot-de-passe"}).status_code == 401
    assert client.post("/api/auth/login", json={"username": "gardien", "password": "second-mot-de-passe"}).status_code == 200
    # Un compte de foyer n'est pas une porte de secours : la commande le refuse.
    with database.SessionLocal() as session:
        assert cli.executer(["operateur", "mot-de-passe", "paul"], session) == 1


def test_le_proprietaire_amorce_l_operateur_sans_le_voir(client, db):
    jeton = _inscrire(client)
    assert client.get("/api/auth/me", headers=_en_tete(jeton)).json()["operateur_existe"] is False

    reponse = client.post("/api/auth/operateur", json={"username": "gardien", "password": MOT_DE_PASSE}, headers=_en_tete(jeton))

    assert reponse.status_code == 201
    # Le propriétaire apprend qu'un opérateur existe sans que la base lui montre ce compte.
    assert client.get("/api/auth/me", headers=_en_tete(jeton)).json()["operateur_existe"] is True
    assert client.post("/api/auth/operateur", json={"username": "autre", "password": MOT_DE_PASSE}, headers=_en_tete(jeton)).status_code == 409
