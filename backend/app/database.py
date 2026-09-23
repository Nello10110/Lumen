"""Connexion SQLite + migrations de schéma au démarrage.

Les migrations passent par Alembic (backlog 2.I.4) — `upgrade_schema()` ci-dessous
appelle `alembic upgrade head`, qui crée ou met à jour le schéma jusqu'à la révision
la plus récente (`backend/alembic/versions/`), aussi bien sur une base neuve que sur
une base existante. Les anciennes fonctions maison (`run_startup_migrations` et les
migrations de contenu one-off) ont été retirées : elles ne savaient qu'ajouter des
colonnes nullable (jamais renommer/retyper une colonne ni changer une contrainte),
ce qui avait déjà nécessité une reconstruction de table écrite à la main pour
`allocation_targets` (Milestone 2a) — d'où l'adoption d'un vrai outil de migration,
avec son mode batch qui automatise cette reconstruction pour SQLite.

Le chemin de la base est pilotable via la variable d'environnement `PATRIMOINE_DB`
(utile pour l'exploitation et pour isoler les tests d'une vraie `patrimoine.db`) ;
à défaut, `_chemin_base_par_defaut()` choisit l'emplacement. `alembic/env.py`
réutilise `DATABASE_URL` défini ici, pour qu'Alembic ouvre toujours exactement le
même fichier que l'application.
"""

import logging
import os
import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

logger = logging.getLogger("patrimoine.database")

_RACINE_BACKEND = Path(__file__).resolve().parent.parent
# Nom de fichier, pas un libellé : il suit les installations existantes et ne suit
# donc PAS les renommages du produit (« Outil Bourse », puis « Application
# Patrimoine », puis « Lumen » depuis le 15/09/2026 — cf. backlog § AD). Le
# rebaptiser `lumen.db` par cohérence de marque ferait repartir toute installation
# en place sur une base vide, exactement le scénario que `_chemin_base_par_defaut`
# ci-dessous existe pour éviter.
_NOM_BASE = "patrimoine.db"
# Nom porté par la base du temps d'« Outil Bourse », deux renommages plus tôt.
_NOM_BASE_HISTORIQUE = "portfolio.db"


def _base_semble_vide(chemin: Path) -> bool:
    """Une base sans table `holdings`, ou dont `holdings` ne contient aucune ligne,
    est considérée vide — critère utilisé uniquement par `_chemin_base_par_defaut`
    pour départager `nouveau` de `historique`, jamais ailleurs. N'importe quelle
    erreur (fichier verrouillé, pas une base SQLite valide...) est traitée comme
    « vide » : en cas de doute, on préfère risquer de retomber sur `historique`
    plutôt que de rater une base réellement vide."""
    if not chemin.exists():
        return True
    try:
        with sqlite3.connect(chemin) as con:
            table_existe = con.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='holdings'"
            ).fetchone()[0]
            if not table_existe:
                return True
            return con.execute("SELECT COUNT(*) FROM holdings").fetchone()[0] == 0
    except sqlite3.Error:
        return True


def _chemin_base_par_defaut() -> Path:
    """Emplacement de la base quand `PATRIMOINE_DB` n'est pas défini.

    Le projet s'appelait « Outil Bourse » et sa base `portfolio.db`. Plutôt que
    d'imposer un renommage manuel du fichier — au risque qu'une installation
    existante démarre sur une base vide et donne l'impression d'avoir tout perdu —
    on continue d'utiliser l'ancien fichier tant qu'il contient les vraies données.

    Comparer le CONTENU (`_base_semble_vide`), pas seulement la présence du fichier
    `nouveau` : un incident réel du 19/08/2026 a montré qu'un `patrimoine.db` vide
    (schéma créé sans donnée — par un redémarrage accidentel, un outil tiers, ou
    n'importe quelle raison créant le fichier sans y écrire de portefeuille) suffit
    à faire échouer un simple test d'existence, masquant silencieusement les
    positions et transactions bien réelles de `historique` au redémarrage
    suivant. Si `nouveau` contient déjà de vraies données, il reste prioritaire —
    ce repli ne s'applique qu'à un `patrimoine.db` réellement vide.
    """
    nouveau = _RACINE_BACKEND / _NOM_BASE
    historique = _RACINE_BACKEND / _NOM_BASE_HISTORIQUE
    if _base_semble_vide(nouveau) and not _base_semble_vide(historique):
        logger.info(
            "base de données : utilisation du fichier historique %s (%s est vide ou absent ; "
            "renommez %s en %s quand vous voulez, l'application suivra).",
            historique.name,
            _NOM_BASE,
            historique.name,
            _NOM_BASE,
        )
        return historique
    return nouveau


# Base serveur (backlog § BI.4, préparation d'une version hébergée) : une URL
# SQLAlchemy complète dans `PATRIMOINE_DATABASE_URL` — `postgresql+psycopg://...` —
# prend le pas sur tout ce qui suit. Sans elle, RIEN ne change pour une installation
# auto-hébergée : fichier SQLite, choix de son emplacement, mode WAL, sauvegardes.
# `DB_PATH` vaut alors `None` : il n'existe pas de fichier de base à désigner.
_URL_EXPLICITE = os.environ.get("PATRIMOINE_DATABASE_URL")
if _URL_EXPLICITE:
    DATABASE_URL = _URL_EXPLICITE
    DB_PATH: Path | None = None
else:
    DB_PATH = Path(os.environ["PATRIMOINE_DB"]) if os.environ.get("PATRIMOINE_DB") else _chemin_base_par_defaut()
    DATABASE_URL = f"sqlite:///{DB_PATH}"
EST_SQLITE = DATABASE_URL.startswith("sqlite")

# `timeout` (secondes) : passé tel quel à `sqlite3.connect`, il règle le
# `busy_timeout` SQLite de la connexion — une écriture concurrente ATTEND ce délai
# avant d'échouer en `database is locked`, plutôt que d'échouer immédiatement (repli
# par défaut de `sqlite3`, 5 s — trop court face à un job de fond qui peut tenir la
# connexion plusieurs dizaines de secondes, cf. `market_data_refresh.py`, backlog
# § T.2). Le mode WAL (`PRAGMA journal_mode=WAL`, posé sur chaque nouvelle connexion
# ci-dessous — c'est un réglage par connexion, pas par requête) réduit en plus la
# contention en autorisant les lecteurs à ne jamais attendre un écrivain en cours ;
# les deux réglages sont complémentaires, ni l'un ni l'autre ne suffit seul face à
# une transaction d'écriture tenue longtemps (cf. aussi le commit par ticker dans
# `market_data_service.refresh_tickers`, qui borne cette durée à la source).
#
# Réglages propres à SQLite, donc réservés à SQLite. Une base serveur gère elle-même
# la concurrence ; `pool_pre_ping` y écarte une connexion rompue par le serveur
# (redémarrage, délai d'inactivité) avant qu'une requête ne tombe dessus.
if EST_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 30})

    @event.listens_for(engine, "connect")
    def _activer_mode_wal(dbapi_connection, _connection_record) -> None:
        dbapi_connection.execute("PRAGMA journal_mode=WAL")

else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Séparation des foyers imposée par la base (backlog § BI.5) ──────────────────
#
# Sous Postgres, chaque table de foyer porte une politique de sécurité au niveau des
# lignes (RLS, migration `c3a8e1f0b6d2`) : une requête ne voit et n'écrit que les
# lignes du foyer désigné par le réglage de transaction `app.foyer_id`. Un filtre
# `user_id == …` oublié dans une route future ne renvoie alors plus les données de
# tous les foyers : il ne renvoie que celles du foyer connecté.
#
# Le PÉRIMÈTRE d'une session vit dans `session.info` et il est reposé au début de
# chaque transaction (`set_config(..., true)` : local à la transaction, il disparaît
# au commit — jamais de fuite d'une requête à la suivante par le pool de connexions).
# Trois cas :
#
# - aucun périmètre (défaut) : la base ne montre AUCUNE ligne de foyer. C'est l'état
#   d'une requête avant authentification ; un oubli se voit, il ne fuit pas ;
# - `fixer_foyer` : posé par l'authentification (`auth.get_current_user`) ;
# - `tous_les_foyers` : explicite, pour les tâches de fond qui parcourent tous les
#   foyers (rafraîchissement des cours, démarrage, planificateur) — voir
#   `session_tous_foyers`.
#
# Sous SQLite, rien de tout cela n'existe : le périmètre est noté, jamais appliqué.
_SANS_PERIMETRE = ("", "", "off")


def _appliquer_perimetre(session: Session, connexion) -> None:
    foyer, utilisateur, tous = session.info.get("perimetre", _SANS_PERIMETRE)
    connexion.execute(
        text(
            "SELECT set_config('app.foyer_id', :foyer, true), set_config('app.utilisateur_id', :utilisateur, true), "
            "set_config('app.tous_foyers', :tous, true)"
        ),
        {"foyer": foyer, "utilisateur": utilisateur, "tous": tous},
    )


@event.listens_for(SessionLocal, "after_begin")
def _poser_perimetre(session: Session, _transaction, connexion) -> None:
    if connexion.dialect.name == "postgresql":
        _appliquer_perimetre(session, connexion)


def _changer_perimetre(session: Session, perimetre: tuple[str, str, str]) -> None:
    session.info["perimetre"] = perimetre
    # Transaction déjà ouverte (l'authentification vient de lire le jeton) : le
    # nouveau périmètre doit valoir tout de suite, pas au prochain commit.
    if session.in_transaction():
        connexion = session.connection()
        if connexion.dialect.name == "postgresql":
            _appliquer_perimetre(session, connexion)


def fixer_foyer(session: Session, foyer_id: int, utilisateur_id: int) -> None:
    """Restreint la session au foyer `foyer_id`. `utilisateur_id` (le membre connecté,
    qui peut différer du foyer) ne sert qu'à ses préférences personnelles."""
    _changer_perimetre(session, (str(foyer_id), str(utilisateur_id), "off"))


def tous_les_foyers(session: Session) -> Session:
    """Lève la restriction, explicitement : réservé aux traitements qui portent par
    nature sur tous les foyers."""
    _changer_perimetre(session, ("", "", "on"))
    return session


def sans_perimetre(session: Session) -> None:
    """Retour à l'état par défaut : aucune ligne de foyer visible."""
    _changer_perimetre(session, _SANS_PERIMETRE)


def session_tous_foyers() -> Session:
    """Session d'une tâche de fond — cf. `tous_les_foyers`."""
    return tous_les_foyers(SessionLocal())


def avertir_si_separation_contournee() -> bool:
    """Un superutilisateur ou un rôle `BYPASSRLS` échappe à toute politique RLS : la
    séparation des foyers ne tiendrait plus qu'aux filtres du code, sans que rien ne
    le montre. Dit au démarrage, en clair. Renvoie `True` si c'est le cas."""
    if EST_SQLITE:
        return False
    with engine.connect() as connexion:
        contournee = connexion.execute(
            text("SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user")
        ).scalar()
    if contournee:
        logger.warning(
            "le rôle de connexion à la base est superutilisateur ou BYPASSRLS : la séparation des foyers "
            "n'est PAS imposée par la base (§ BI.5). Connectez l'application avec un rôle ordinaire."
        )
    return bool(contournee)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def upgrade_schema() -> None:
    """Amène le schéma à la dernière révision Alembic (`backend/alembic/versions/`),
    aussi bien sur une base neuve (crée tout depuis zéro) que sur une base existante
    (applique uniquement les révisions manquantes) — remplace l'ancien duo
    `Base.metadata.create_all()` + fonctions de migration maison.

    Construit la config Alembic par programmation plutôt que de dépendre du
    répertoire courant du process (`alembic.ini` résolu depuis `_RACINE_BACKEND`,
    comme la base elle-même) et force `sqlalchemy.url` sur `DATABASE_URL` — la
    même résolution dynamique que le reste de l'application (`PATRIMOINE_DB`,
    repli sur l'ancien nom de base), pour qu'Alembic ouvre toujours exactement le
    fichier que `engine` ouvre déjà."""
    from alembic.config import Config

    from alembic import command

    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
    command.upgrade(cfg, "head")
