"""Garde-fou global des tests.

`app.main` crée le schéma et lance les migrations dès son import : si un test
importait ce module (même indirectement) avant que `PATRIMOINE_DB` ne soit
positionné, la vraie `patrimoine.db` du dépôt serait créée/modifiée. Pytest charge
les `conftest.py` de la racine vers les sous-dossiers avant toute collecte de
test — ce fichier fixe donc la variable d'environnement vers un fichier jetable
avant que quoi que ce soit dans `tests/` ne puisse importer l'application.

Pose aussi `PATRIMOINE_TESTING`, lue une seule fois par `services/market_data_service`
à son import pour neutraliser la temporisation entre deux appels Yahoo Finance
(cf. LOT 7.5) : la suite de tests n'appelle jamais le réseau (`no_network_yfinance`
dans `tests/conftest.py`), un `time.sleep` réel n'y apporterait donc rien d'utile et
ferait juste traîner l'exécution.
"""

import atexit
import os
import tempfile

# Mode Postgres (backlog § BI.4), à la demande : `PATRIMOINE_TEST_DATABASE_URL`
# désigne une base serveur JETABLE, remise à vide ici (schéma `public` détruit puis
# recréé) avant que l'import de l'application n'y rejoue toutes les migrations
# Alembic — la suite vérifie ainsi l'application ET les migrations sur Postgres.
# Sans cette variable, rien ne change : SQLite, fichier temporaire.
_URL_TEST = os.environ.get("PATRIMOINE_TEST_DATABASE_URL")
if _URL_TEST:
    from sqlalchemy import create_engine, text

    _moteur = create_engine(_URL_TEST)
    with _moteur.begin() as _connexion:
        _connexion.execute(text("DROP SCHEMA public CASCADE"))
        _connexion.execute(text("CREATE SCHEMA public"))
    _moteur.dispose()
    os.environ["PATRIMOINE_DATABASE_URL"] = _URL_TEST
elif "PATRIMOINE_DB" not in os.environ:
    _fd, _chemin_db_session = tempfile.mkstemp(prefix="patrimoine_tests_", suffix=".db")
    os.close(_fd)
    os.environ["PATRIMOINE_DB"] = _chemin_db_session
    atexit.register(lambda: os.path.exists(_chemin_db_session) and os.remove(_chemin_db_session))

os.environ.setdefault("PATRIMOINE_TESTING", "1")
