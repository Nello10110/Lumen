"""Fixtures partagées par toute la suite de tests backend.

- `db` : session SQLAlchemy sur une base SQLite temporaire et jetable (fichier
  distinct à chaque test, jamais la vraie `patrimoine.db`), schéma posé via
  `Base.metadata.create_all`.
- `client` : `TestClient` FastAPI dont la dépendance `get_db` est basculée vers
  cette même base jetable, et `get_current_user` (Milestone 1, multi-utilisateur)
  vers un utilisateur de test fixe, propriétaire du foyer de test — toutes les routes
  exigent désormais d'être connecté, cf. `main.py`.
- `no_network_yfinance` (autouse) : neutralise `yf.Ticker` et `yf.Search`, les
  deux seuls points d'entrée yfinance utilisés par le projet, pour qu'aucun test
  ne dépende du réseau ni de la disponibilité de Yahoo Finance.
- `no_network_justetf` (autouse) : même principe, côté `requests.get` — seul point
  d'entrée réseau de `justetf_service` (`_fetch_page_html`/`fetch_price`, 2.4).
  Sans cette neutralisation, tout test exerçant `market_data_service.refresh_tickers`
  (ou `market_data_refresh.demarrer_rafraichissement`, cf. ci-dessous)
  ou `justetf_service.refresh_all` sur un ticker `FUND` sans monkeypatch explicite
  ferait un vrai appel réseau vers justetf.com.
- `no_network_coingecko` (autouse) : même principe, côté `requests.get` — seul
  point d'entrée réseau de `coingecko_service` (`fetch_price`, 15/09/2026).
  Sans elle, tout test exerçant `refresh_tickers` sur un ticker `CRYPTO` sans
  monkeypatch explicite ferait un vrai appel réseau vers l'API CoinGecko.
- `reinitialiser_limite_rafraichissement_manuel` (autouse) : remet à zéro l'état
  mémoire du délai minimal entre rafraîchissements manuels (LOT 7.5) entre chaque
  test, pour qu'un test n'hérite pas d'un rafraîchissement déclenché par un test
  précédent dans le même process.
- `reinitialiser_rafraichissement_arriere_plan` (autouse) : attend la fin du fil de
  fond du rafraîchissement (LOT 4B, `market_data_refresh.demarrer_rafraichissement`)
  et remet à zéro son état module-level entre chaque test. `attendre_fin_rafraichissement_arriere_plan`
  (fonction, pas fixture) rend ce fil déterministe dans les tests qui veulent
  observer son état final sans sonder à intervalles réels.
"""

import itertools
import os
import tempfile
from datetime import datetime

import pytest
import yfinance as yf
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app import database
from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models import ROLE_PROPRIETAIRE, Appartenance, Compte, Foyer, Holding, Transaction, User
from app.services import auth_service, coingecko_service, justetf_service, market_data_refresh

_compteur_transaction_id = itertools.count(1)
_compteur_compte_nom = itertools.count(1)

# Multi-utilisateur (Milestone 2a, isolation des données) : la fixture `db` crée ce
# compte, propriétaire du foyer `ID_FOYER_TEST`, avec des ids fixés explicitement
# plutôt que de compter sur l'autoincrément. `make_holding`/`make_transaction`
# rattachent leurs lignes à ce FOYER par défaut ; les tests qui construisent une ligne
# directement (`Holding(...)`, `Transaction(...)`, `Loan(...)`) passent
# `foyer_id=ID_FOYER_TEST` explicitement.
ID_UTILISATEUR_TEST = 1
NOM_UTILISATEUR_TEST = "test"
# Second compte, pour les tests d'isolation inter-utilisateurs (Milestone 2a,
# `tests/test_isolation_utilisateurs.py`) — créé par `basculer_utilisateur`, jamais
# par `db` (qui ne crée que ID_UTILISATEUR_TEST), pour ne pas fausser les
# tests existants qui ne s'attendent qu'à un seul utilisateur en base.
ID_UTILISATEUR_B = 2
NOM_UTILISATEUR_B = "test-b"

# Foyers (§ BK.2) : leurs identifiants sont DÉCALÉS de ceux des comptes. Un compte
# (`current_user.id`) employé par erreur à la place du foyer désigne alors un foyer
# qui n'existe pas — le test échoue, au lieu de passer par coïncidence des ids.
DECALAGE_FOYER = 10
ID_FOYER_TEST = ID_UTILISATEUR_TEST + DECALAGE_FOYER
ID_FOYER_B = ID_UTILISATEUR_B + DECALAGE_FOYER


def _db_postgres():
    """Mode Postgres (§ BI.4, cf. `conftest.py` racine) : une seule base, dont le
    schéma a été posé par les migrations Alembic à l'import de l'application ; vidée
    au début de chaque test (`RESTART IDENTITY` : les identifiants repartent de 1,
    comme sur une base SQLite neuve)."""
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    with database.engine.begin() as connexion:
        connexion.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    # Le banc de test agit en administrateur : il crée et relit les données de
    # plusieurs foyers. La séparation (§ BI.5) se vérifie dans ses tests dédiés.
    session = database.session_tous_foyers()
    # ... et des comptes : `users`, `auth_tokens` et `access_log_entries` n'obéissent pas aux
    # foyers mais à l'état d'authentification (§ BK.2e), que ce banc garde posé en permanence.
    session.info["authentification"] = "on"
    _creer_proprietaire_de_test(session)
    _resynchroniser_sequences(session)
    try:
        yield session
    finally:
        session.close()


def _resynchroniser_sequences(session) -> None:
    """Un `id` écrit explicitement n'avance PAS la séquence Postgres (SQLite, lui,
    repart toujours du plus grand id) : sans ce recalage, le prochain compte ou foyer
    créé sans id (inscription) reprendrait un id déjà pris."""
    if database.EST_SQLITE:
        return
    for table in ("users", "foyers"):
        session.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), (SELECT MAX(id) FROM {table}))"))
    session.commit()


def _creer_proprietaire_de_test(session) -> None:
    session.add(User(id=ID_UTILISATEUR_TEST, username=NOM_UTILISATEUR_TEST, password_hash="inutilisé"))
    session.add(Foyer(id=ID_FOYER_TEST))
    session.flush()
    session.add(Appartenance(user_id=ID_UTILISATEUR_TEST, foyer_id=ID_FOYER_TEST, role=ROLE_PROPRIETAIRE))
    session.commit()


def _activer_cles_etrangeres(connexion_dbapi, _enregistrement) -> None:
    """SQLite ne vérifie pas les clés étrangères sans ce PRAGMA, alors que Postgres le
    fait toujours : sans lui, un test qui rattache une ligne à un foyer inexistant
    passerait ici et n'échouerait qu'en CI Postgres."""
    curseur = connexion_dbapi.cursor()
    curseur.execute("PRAGMA foreign_keys=ON")
    curseur.close()


@pytest.fixture
def db():
    if not database.EST_SQLITE:
        yield from _db_postgres()
        return
    fd, chemin = tempfile.mkstemp(prefix="patrimoine_test_db_", suffix=".db")
    os.close(fd)
    engine_test = create_engine(f"sqlite:///{chemin}", connect_args={"check_same_thread": False})
    event.listen(engine_test, "connect", _activer_cles_etrangeres)
    Base.metadata.create_all(bind=engine_test)
    SessionLocalTest = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)
    session = SessionLocalTest()
    _creer_proprietaire_de_test(session)
    try:
        yield session
    finally:
        session.close()
        engine_test.dispose()
        os.remove(chemin)


@pytest.fixture
def client(db):
    """`get_current_user` est aussi basculée (Milestone 1, multi-utilisateur) vers
    l'utilisateur de test fixe créé par la fixture `db` : la quasi-totalité de la
    suite ne teste pas l'authentification elle-même, seulement le comportement des
    routes UNE FOIS connecté — sans cet override, les ~400 tests existants
    échoueraient tous en 401. `tests/test_auth_router.py` retire volontairement cet
    override pour exercer le vrai comportement (401 sans jeton, jeton invalide/expiré)."""

    def _override_get_db():
        yield db

    utilisateur_test = en_session(db.get(User, ID_UTILISATEUR_TEST), ID_FOYER_TEST)

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[get_current_user] = lambda: utilisateur_test
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client_jetons(db):
    """Jetons de session RÉELS, sans substitution de `get_current_user` : c'est
    l'authentification elle-même qui est exercée (foyer courant de la session, rôle de
    l'appartenance). Chaque requête ouvre sa propre session de base, comme en production
    — sous Postgres, sans périmètre tant que l'authentification ne l'a pas posé."""
    fabrique = sessionmaker(bind=db.get_bind()) if database.EST_SQLITE else database.SessionLocal

    def _db_par_requete():
        session = fabrique()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _db_par_requete
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)


def jeton_de_session(db, user_id: int) -> dict:
    """En-têtes d'une session ouverte pour `user_id` (sur son dernier foyer utilisé)."""
    user = db.get(User, user_id)
    _, jeton = auth_service.ouvrir_session(db, user)
    database.tous_les_foyers(db)  # le banc de test reprend la main sur tous les foyers
    return {"Authorization": f"Bearer {jeton}"}


def en_session(utilisateur: User, foyer_id: int | None, role: str | None = ROLE_PROPRIETAIRE) -> User:
    """Ce que l'authentification pose sur le compte (`auth_service.adopter_foyer`),
    pour les tests qui la court-circuitent."""
    utilisateur.foyer_courant_id = foyer_id
    utilisateur.role = role if foyer_id is not None else None
    return utilisateur


def creer_foyer(db, foyer_id: int) -> Foyer:
    """Crée le foyer `foyer_id` s'il n'existe pas encore. Une ligne de test rattachée à
    un foyer qui n'existe pas passe sous SQLite, qui ne vérifie pas les clés
    étrangères, mais Postgres la refuse (§ BI.4) : un test qui simule « un autre
    foyer » doit donc le créer pour de bon."""
    foyer = db.get(Foyer, foyer_id)
    if foyer is None:
        foyer = Foyer(id=foyer_id)
        db.add(foyer)
        db.commit()
        _resynchroniser_sequences(db)
    return foyer


def creer_utilisateur(db, user_id: int, username: str | None = None) -> User:
    """Crée le compte `user_id` s'il n'existe pas encore, propriétaire de son foyer
    (`user_id + DECALAGE_FOYER`). Renvoyé tel que l'authentification le pose."""
    utilisateur = db.get(User, user_id)
    foyer_id = user_id + DECALAGE_FOYER
    if utilisateur is None:
        utilisateur = User(id=user_id, username=username or f"utilisateur-{user_id}", password_hash="inutilisé")
        db.add(utilisateur)
        db.commit()
        creer_foyer(db, foyer_id)
        db.add(Appartenance(user_id=user_id, foyer_id=foyer_id, role=ROLE_PROPRIETAIRE))
        db.commit()
        _resynchroniser_sequences(db)
    return en_session(utilisateur, foyer_id)


def basculer_utilisateur(db, user_id: int, username: str) -> User:
    """Repointe `get_current_user` (Milestone 2a, `test_isolation_utilisateurs.py`)
    vers un autre compte, créé au passage si besoin, sur le MÊME `client` déjà en
    place — `app.dependency_overrides` est un dict global sur l'objet `app` unique
    du process de test : deux fixtures `client` séparées s'écraseraient l'une
    l'autre plutôt que de coexister, d'où ce basculement explicite en cours de test
    plutôt qu'une seconde fixture `client_b`."""
    utilisateur = creer_utilisateur(db, user_id, username)
    app.dependency_overrides[get_current_user] = lambda: utilisateur
    return utilisateur


class FauxTicker:
    """Double contrôlable pour `yf.Ticker` : par défaut aucune donnée (comme un
    identifiant non reconnu par Yahoo Finance), à surcharger au cas par cas."""

    def __init__(self, symbole, *args, **kwargs):
        self.symbole = symbole
        self.info: dict = {}
        self.funds_data = None


class FauxSearch:
    """Double contrôlable pour `yf.Search` : aucun résultat par défaut."""

    def __init__(self, *args, **kwargs):
        self.quotes: list = []


@pytest.fixture(autouse=True)
def no_network_yfinance(monkeypatch):
    monkeypatch.setattr(yf, "Ticker", FauxTicker)
    monkeypatch.setattr(yf, "Search", FauxSearch)


def _requests_get_bloque(*args, **kwargs):
    raise ConnectionError("appel réseau réel bloqué en test — cf. fixture no_network_justetf")


@pytest.fixture(autouse=True)
def no_network_justetf(monkeypatch):
    """Neutralise `requests.get` (seul point d'entrée réseau de `justetf_service`,
    cf. docstring du module) pour qu'aucun test n'appelle réellement justetf.com.
    `_fetch_page_html` et `fetch_price` absorbent déjà toute exception réseau et
    renvoient `None` — un test qui a besoin d'un scénario précis (succès, statut
    HTTP particulier, JSON inattendu...) monkeypatche `requests.get` lui-même, ce
    qui prime naturellement sur ce défaut."""
    monkeypatch.setattr(justetf_service.requests, "get", _requests_get_bloque)


@pytest.fixture(autouse=True)
def no_network_coingecko(monkeypatch):
    """Même principe que `no_network_justetf`, côté `coingecko_service`
    (15/09/2026) — seul point d'entrée réseau : `requests.get` dans `fetch_price`.
    Sans elle, tout test exerçant `refresh_tickers` sur un ticker `CRYPTO` sans
    monkeypatch explicite ferait un vrai appel réseau vers l'API CoinGecko."""
    monkeypatch.setattr(coingecko_service.requests, "get", _requests_get_bloque)


@pytest.fixture(autouse=True)
def reinitialiser_limite_rafraichissement_manuel(monkeypatch):
    monkeypatch.setattr(market_data_refresh, "_dernier_rafraichissement_manuel", None)


@pytest.fixture(autouse=True)
def reinitialiser_rafraichissement_arriere_plan():
    """Isole l'état module-level du rafraîchissement en tâche de fond (LOT 4B)
    entre deux tests : sans ça, un `en_cours=True` laissé par un test précédent
    ferait échouer le suivant en 409, et un fil encore vivant pourrait continuer à
    écrire dans la base partagée par les tests après la fin du test qui l'a lancé.
    Attend la fin du fil éventuellement laissé vivant (délai maximal court : aucun
    test de cette suite ne simule un vrai appel réseau, donc rien ne devrait jamais
    tourner plus de quelques millisecondes) avant de remettre l'état à zéro."""
    yield
    attendre_fin_rafraichissement_arriere_plan()
    market_data_refresh._etat = market_data_refresh.EtatRafraichissement()
    market_data_refresh._thread_courant = None


def attendre_fin_rafraichissement_arriere_plan(timeout: float = 5.0) -> None:
    """Rend le fil de fond de `market_data_refresh.demarrer_rafraichissement`
    déterministe pour les tests : plutôt que de sonder l'état à intervalles réels
    (ce que fait le frontend, cf. LOT 4B), on attend simplement que le fil ait
    terminé, avec un délai maximal généreux pour ne jamais bloquer indéfiniment si
    un test est mal formé. `no_network_yfinance` garantit qu'aucun test n'appelle
    réellement Yahoo Finance, donc ce fil se termine en pratique quasi
    instantanément."""
    thread = market_data_refresh._thread_courant
    if thread is not None:
        thread.join(timeout=timeout)


def make_transaction(db, **overrides) -> Transaction:
    """Construit et persiste une transaction de test avec des valeurs par défaut
    raisonnables (achat en bourse), surchargeables au cas par cas."""
    defaults = dict(
        foyer_id=ID_FOYER_TEST,
        transaction_id=f"tx-test-{next(_compteur_transaction_id)}",
        datetime_utc=datetime(2024, 1, 1),
        date="2024-01-01",
        category="TRADING",
        type="BUY",
        asset_class="STOCK",
        symbol="TEST",
        name="Titre de test",
        shares=1.0,
        price=100.0,
        amount=-100.0,
        fee=0.0,
        tax=0.0,
        description=None,
    )
    defaults.update(overrides)
    tx = Transaction(**defaults)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def make_compte(db, **overrides) -> Compte:
    """Construit et persiste un compte de test — contourne l'API (donc l'obligation
    d'`etablissement_id` posée par `CompteCreate`, revue du 03/09/2026) exactement
    comme `make_holding` ci-dessous contourne `HoldingCreate` : pour les tests qui
    ne portent pas sur la création d'un compte elle-même, juste sur un compte
    déjà là."""
    # Nom par défaut unique (compteur, comme `make_transaction` ci-dessus) :
    # `UniqueConstraint(foyer_id, nom)` refuserait un deuxième appel par défaut dans
    # le même test.
    defaults = dict(
        foyer_id=ID_FOYER_TEST, nom=f"Compte Test {next(_compteur_compte_nom)}", etablissement_id=None
    )
    defaults.update(overrides)
    compte = Compte(**defaults)
    db.add(compte)
    db.commit()
    db.refresh(compte)
    return compte


def make_holding(db, **overrides) -> Holding:
    """Construit et persiste une ligne de portefeuille de test."""
    defaults = dict(
        foyer_id=ID_FOYER_TEST,
        ticker="TEST",
        nom="Titre de test",
        quantite=10.0,
        prix_revient_moyen=100.0,
        type_actif="STOCK",
    )
    defaults.update(overrides)
    holding = Holding(**defaults)
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return holding
