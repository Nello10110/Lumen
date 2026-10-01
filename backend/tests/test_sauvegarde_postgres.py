"""Sauvegarde et restauration sous Postgres (backlog § BK.1).

Deux niveaux :

- sans serveur (toujours joués) : les commandes passées à `pg_dump`, `pg_restore` et
  `psql` — mot de passe jamais en ligne de commande, séparation des foyers ouverte
  explicitement (foyers ET état d'authentification, § BK.2e), schéma remplacé dans une
  seule transaction, copie de sécurité prise AVANT d'y toucher ;
- contre la base de la suite Postgres (job CI `backend-postgres`, outils du client
  PostgreSQL 16 requis) : ce que la séparation des foyers (§ BI.5) fait à un
  `pg_dump` ordinaire, et l'aller-retour réel — une sauvegarde chiffrée qui contient
  les lignes de TOUS les foyers, leurs comptes, sessions et journal d'accès, rendue par
  la restauration du CLI.
"""

import os
import re
import subprocess
from datetime import datetime
from pathlib import Path

import pytest
from cryptography.fernet import Fernet
from sqlalchemy import create_engine, make_url, text

from app import database
from app.models import AccessLogEntry, AuthToken, HoldingValuationHistory
from app.services import backup_service
from scripts import sauvegarde

from .conftest import ID_FOYER_TEST, ID_UTILISATEUR_TEST, creer_foyer, make_holding

URL = "postgresql+psycopg://lumen_app:m%40t%20de%2Fpasse@db.exemple:5433/lumen?sslmode=require"
MOT_DE_PASSE = "m@t de/passe"


# ── Sans serveur ────────────────────────────────────────────────────────────────


def test_uri_libpq_retire_le_mot_de_passe_et_garde_le_reste():
    assert sauvegarde.uri_libpq(URL) == "postgresql://lumen_app@db.exemple:5433/lumen?sslmode=require"
    assert sauvegarde.uri_libpq("postgresql+psycopg://lumen_app@postgres:5432/lumen") == (
        "postgresql://lumen_app@postgres:5432/lumen"
    )


def test_uri_libpq_refuse_une_url_sqlite():
    with pytest.raises(ValueError, match="non Postgres"):
        sauvegarde.uri_libpq("sqlite:///patrimoine.db")


def test_connexion_postgres_passe_le_mot_de_passe_par_l_environnement(monkeypatch):
    monkeypatch.setenv("PGOPTIONS", "-c statement_timeout=0")

    uri, environnement = sauvegarde.connexion_postgres(URL)

    assert MOT_DE_PASSE not in uri and "m%40t" not in uri
    assert environnement["PGPASSWORD"] == MOT_DE_PASSE
    # Les options déjà posées par l'exploitant sont conservées.
    assert environnement["PGOPTIONS"] == f"-c statement_timeout=0 {sauvegarde.OPTIONS_SANS_RESTRICTION}"
    assert "-c app.tous_foyers=on" in environnement["PGOPTIONS"] and "-c app.authentification=on" in environnement["PGOPTIONS"]


def test_sans_mot_de_passe_dans_l_url_celui_de_l_environnement_vaut(monkeypatch):
    """Le compose passe le mot de passe par `PGPASSWORD`, jamais dans l'URL."""
    monkeypatch.setenv("PGPASSWORD", "venu-du-compose")

    _, environnement = sauvegarde.connexion_postgres("postgresql+psycopg://lumen_app@postgres:5432/lumen")

    assert environnement["PGPASSWORD"] == "venu-du-compose"


class _OutilsFactices:
    """Remplace `subprocess.run` : note chaque appel, simule le strict nécessaire."""

    def __init__(self, tables_presentes=sauvegarde.TABLES_PRINCIPALES):
        self.appels: list[tuple[list[str], dict | None]] = []
        self.tables_presentes = tables_presentes

    def __call__(self, commande, env=None, **_kwargs):
        self.appels.append((commande, env))
        outil = commande[0]
        for argument in commande:
            if argument.startswith("--file=") and outil in ("pg_dump", "pg_restore"):
                Path(argument.removeprefix("--file=")).write_bytes(b"contenu")
        sortie = ""
        if outil == "pg_restore" and "--list" in commande:
            sortie = "".join(f"1; 0 1 TABLE DATA public {table} lumen_app\n" for table in self.tables_presentes)
        return subprocess.CompletedProcess(commande, 0, stdout=sortie, stderr="")

    def outils(self):
        return [commande[0] for commande, _ in self.appels]


@pytest.fixture
def outils(monkeypatch):
    factices = _OutilsFactices()
    monkeypatch.setattr(sauvegarde.shutil, "which", lambda nom: nom)
    monkeypatch.setattr(sauvegarde.subprocess, "run", factices)
    return factices


def test_sauvegarde_ouvre_tous_les_foyers_sans_exposer_le_mot_de_passe(outils, tmp_path):
    chemin = sauvegarde.sauvegarder_postgres(URL, tmp_path)

    assert re.fullmatch(r"patrimoine-\d{8}-\d{6}\.dump", chemin.name)
    assert outils.outils() == ["pg_dump", "pg_restore"]
    commande, environnement = outils.appels[0]
    assert "--enable-row-security" in commande and "--format=custom" in commande
    assert environnement["PGOPTIONS"].endswith(sauvegarde.OPTIONS_SANS_RESTRICTION)
    for commande_passee, _ in outils.appels:
        assert not any(MOT_DE_PASSE in argument or "m%40t" in argument for argument in commande_passee)


def test_archive_sans_les_tables_principales_refusee_et_supprimee(monkeypatch, tmp_path):
    factices = _OutilsFactices(tables_presentes=("holdings",))
    monkeypatch.setattr(sauvegarde.shutil, "which", lambda nom: nom)
    monkeypatch.setattr(sauvegarde.subprocess, "run", factices)

    with pytest.raises(sauvegarde.SauvegardeInvalideError, match="transactions"):
        sauvegarde.sauvegarder_postgres(URL, tmp_path)

    assert list(tmp_path.iterdir()) == []


def test_outil_absent_message_qui_dit_quoi_installer(monkeypatch, tmp_path):
    monkeypatch.setattr(sauvegarde.shutil, "which", lambda _nom: None)

    with pytest.raises(sauvegarde.OutilPostgresError, match="postgresql-client-16"):
        sauvegarde.sauvegarder_postgres(URL, tmp_path)


def test_restauration_met_de_cote_puis_remplace_le_schema_en_une_transaction(outils, tmp_path):
    archive = tmp_path / "patrimoine-20260101-020000.dump"
    archive.write_bytes(b"archive")

    mise_de_cote = sauvegarde.restaurer_postgres(archive, URL, tmp_path / "sauvegardes")

    assert mise_de_cote.name.startswith("patrimoine-avant-restauration-") and mise_de_cote.exists()
    # Vérification de l'archive, copie de sécurité, script SQL, chargement : dans cet ordre.
    assert outils.outils() == ["pg_restore", "pg_dump", "pg_restore", "psql"]
    psql, environnement = outils.appels[-1]
    assert "--single-transaction" in psql and "--set=ON_ERROR_STOP=1" in psql
    ordre = [a for a in psql if a.startswith(("--command=", "--file="))]
    assert ordre[:2] == ["--command=DROP SCHEMA public CASCADE", "--command=CREATE SCHEMA public"]
    assert ordre[2].startswith("--file=")
    assert environnement["PGPASSWORD"] == MOT_DE_PASSE
    assert environnement["PGOPTIONS"].endswith(sauvegarde.OPTIONS_SANS_RESTRICTION)


def test_la_copie_de_securite_n_est_pas_soumise_a_la_retention(outils, tmp_path):
    archive = tmp_path / "patrimoine-20260101-020000.dump"
    archive.write_bytes(b"archive")
    dossier = tmp_path / "sauvegardes"

    mise_de_cote = sauvegarde.restaurer_postgres(archive, URL, dossier)

    assert mise_de_cote not in sauvegarde.lister_sauvegardes(dossier)


def test_cli_refuse_une_sauvegarde_sqlite_sur_une_base_postgres(outils, tmp_path, monkeypatch):
    monkeypatch.setenv("PATRIMOINE_DATABASE_URL", URL)
    fichier = tmp_path / "patrimoine-20260101-020000.db"
    fichier.write_bytes(b"sqlite")

    code = sauvegarde.main(["--restaurer", str(fichier), "--dossier", str(tmp_path), "--forcer"])

    assert code == 1
    assert outils.appels == []


def test_cli_refuse_une_archive_postgres_sans_base_postgres(outils, tmp_path, monkeypatch):
    monkeypatch.delenv("PATRIMOINE_DATABASE_URL", raising=False)
    fichier = tmp_path / "patrimoine-20260101-020000.dump"
    fichier.write_bytes(b"archive")

    code = sauvegarde.main(["--restaurer", str(fichier), "--base", str(tmp_path / "x.db"), "--dossier", str(tmp_path), "--forcer"])

    assert code == 1
    assert outils.appels == []


def test_cli_confirmation_nomme_la_base_sans_son_mot_de_passe(outils, tmp_path, monkeypatch):
    monkeypatch.setenv("PATRIMOINE_DATABASE_URL", URL)
    questions = []
    monkeypatch.setattr("builtins.input", lambda question: questions.append(question) or "n")

    code = sauvegarde.main(["--restaurer", str(tmp_path / "x.dump"), "--dossier", str(tmp_path)])

    assert code == 1
    assert "postgresql://lumen_app@db.exemple:5433/lumen" in questions[0]
    assert MOT_DE_PASSE not in questions[0]


# ── Contre la base Postgres de la suite ─────────────────────────────────────────

_POSTGRES = pytest.mark.skipif(database.EST_SQLITE, reason="archive pg_dump : suite Postgres seulement (§ BK.1)")
BASE_RESTAURATION = "lumen_restauration_test"
FOYER_B = 2


@pytest.fixture
def deux_foyers(db):
    """Une ligne, avec un point d'historique (table fille, sans `foyer_id`), dans
    chacun de deux foyers ; et, pour le compte de test, une session et une ligne du journal
    d'accès (des tables que ni `foyer_id` ni « tous les foyers » n'ouvrent, § BK.2e)."""
    creer_foyer(db, FOYER_B)
    for foyer, ticker in ((ID_FOYER_TEST, "A-SEUL"), (FOYER_B, "B-SEUL")):
        ligne = make_holding(db, foyer_id=foyer, ticker=ticker)
        db.add(HoldingValuationHistory(holding_id=ligne.id, valeur=1000.0, date_valeur=datetime(2026, 1, 1)))
    db.add(AuthToken(token_hash="a" * 64, id_session="session-de-test", user_id=ID_UTILISATEUR_TEST, foyer_id=ID_FOYER_TEST, expires_at=datetime(2030, 1, 1)))
    db.add(AccessLogEntry(username_saisi="test", user_id=ID_UTILISATEUR_TEST, action="login", resultat="succes"))
    db.commit()
    return db


def _lignes_archivees(archive: Path, table: str) -> list[str]:
    """Lignes de données de `table` dans l'archive, lues par `pg_restore` seul."""
    script = subprocess.run(
        ["pg_restore", "--data-only", f"--table={table}", "--file=-", str(archive)], capture_output=True, text=True, check=True
    ).stdout
    lignes = script.splitlines()
    debut = next(i for i, ligne in enumerate(lignes) if ligne.startswith("COPY ")) + 1
    return lignes[debut : lignes.index("\\.", debut)]


def _pg_dump_brut(destination: Path, *, options: tuple[str, ...], ouvrir_les_foyers: bool) -> subprocess.CompletedProcess:
    uri, environnement = sauvegarde.connexion_postgres(database.DATABASE_URL)
    if not ouvrir_les_foyers:
        environnement["PGOPTIONS"] = os.environ.get("PGOPTIONS", "")
    return subprocess.run(
        ["pg_dump", "--format=custom", *options, f"--file={destination}", f"--dbname={uri}"],
        env=environnement,
        capture_output=True,
        text=True,
        check=False,
    )


@_POSTGRES
def test_un_pg_dump_ordinaire_echoue_sous_la_separation_des_foyers(deux_foyers, tmp_path):
    """Le piège que `sauvegarder_postgres` contourne : `pg_dump` pose
    `row_security = off`, et le propriétaire des tables, soumis à la séparation par
    `FORCE ROW LEVEL SECURITY`, n'a plus le droit de lire."""
    resultat = _pg_dump_brut(tmp_path / "brut.dump", options=(), ouvrir_les_foyers=True)

    assert resultat.returncode != 0
    assert "row-level security" in resultat.stderr


@_POSTGRES
def test_sans_ouvrir_les_foyers_l_archive_ne_contient_aucune_ligne_de_foyer(deux_foyers, tmp_path):
    """Seconde moitié du piège : les politiques appliquées sans `app.tous_foyers`,
    l'export réussit… et il est vide — une sauvegarde qui ne sauve rien."""
    archive = tmp_path / "vide.dump"
    resultat = _pg_dump_brut(archive, options=("--enable-row-security",), ouvrir_les_foyers=False)

    assert resultat.returncode == 0, resultat.stderr
    assert _lignes_archivees(archive, "holdings") == []
    assert [_lignes_archivees(archive, table) for table in ("users", "auth_tokens", "access_log_entries")] == [[], [], []]


@_POSTGRES
def test_sans_l_etat_d_authentification_l_archive_a_les_foyers_mais_aucun_compte(deux_foyers, tmp_path):
    """Le piège de § BK.2e : `app.tous_foyers` ouvre les foyers, pas les comptes — une sauvegarde qui n'aurait que
    lui serait complète… et sans un seul compte, session ni ligne de journal."""
    archive = tmp_path / "sans-comptes.dump"
    uri, environnement = sauvegarde.connexion_postgres(database.DATABASE_URL)
    environnement["PGOPTIONS"] = "-c app.tous_foyers=on"
    resultat = subprocess.run(
        ["pg_dump", "--format=custom", "--enable-row-security", f"--file={archive}", f"--dbname={uri}"],
        env=environnement,
        capture_output=True,
        text=True,
        check=False,
    )

    assert resultat.returncode == 0, resultat.stderr
    assert len(_lignes_archivees(archive, "holdings")) == 2
    assert [_lignes_archivees(archive, table) for table in ("users", "auth_tokens", "access_log_entries")] == [[], [], []]


@pytest.fixture
def base_de_restauration():
    """Base jetable, propriété du rôle applicatif — comme `lumen` dans le compose."""
    moteur_admin = create_engine(os.environ["PATRIMOINE_TEST_DATABASE_URL"], isolation_level="AUTOCOMMIT")
    role = make_url(database.DATABASE_URL).username
    with moteur_admin.connect() as connexion:
        connexion.execute(text(f"DROP DATABASE IF EXISTS {BASE_RESTAURATION} WITH (FORCE)"))
        connexion.execute(text(f"CREATE DATABASE {BASE_RESTAURATION} OWNER {role}"))
    url_admin = make_url(os.environ["PATRIMOINE_TEST_DATABASE_URL"]).set(database=BASE_RESTAURATION)
    url_application = make_url(database.DATABASE_URL).set(database=BASE_RESTAURATION)
    moteur_lecture = create_engine(url_admin)
    try:
        yield url_application.render_as_string(hide_password=False), moteur_lecture
    finally:
        moteur_lecture.dispose()
        with moteur_admin.connect() as connexion:
            connexion.execute(text(f"DROP DATABASE IF EXISTS {BASE_RESTAURATION} WITH (FORCE)"))
        moteur_admin.dispose()


@_POSTGRES
def test_sauvegarde_chiffree_de_tous_les_foyers_rendue_par_la_restauration_du_cli(
    deux_foyers, base_de_restauration, tmp_path, monkeypatch
):
    url_restauration, moteur_lecture = base_de_restauration
    monkeypatch.setenv(backup_service.VARIABLE_CLE, Fernet.generate_key().decode())
    dossier = tmp_path / "sauvegardes"

    chiffree = backup_service.sauvegarder_postgres_chiffre(database.DATABASE_URL, dossier)

    assert chiffree.name.endswith(".dump.enc")
    assert backup_service.lister_sauvegardes_chiffrees(dossier) == [chiffree]
    # Rien en clair ne reste à côté.
    assert [p.name for p in dossier.iterdir()] == [chiffree.name]
    clair = backup_service.dechiffrer(chiffree, tmp_path / "clair.dump")
    assert len(_lignes_archivees(clair, "holdings")) == 2
    assert len(_lignes_archivees(clair, "holding_valuation_history")) == 2
    # Les comptes, leurs sessions et le journal d'accès voyagent aussi : l'état d'authentification est posé.
    assert len(_lignes_archivees(clair, "users")) == 1
    assert len(_lignes_archivees(clair, "auth_tokens")) == 1
    assert len(_lignes_archivees(clair, "access_log_entries")) == 1

    monkeypatch.setenv("PATRIMOINE_DATABASE_URL", url_restauration)
    assert sauvegarde.main(["--restaurer", str(chiffree), "--dossier", str(dossier), "--forcer"]) == 0

    with moteur_lecture.connect() as connexion:
        assert connexion.execute(text("SELECT ticker FROM holdings ORDER BY ticker")).scalars().all() == ["A-SEUL", "B-SEUL"]
        assert connexion.execute(text("SELECT count(*) FROM holding_valuation_history")).scalar() == 2
        # Les comptes aussi (lus par l'administrateur de la base de lecture, que les politiques ne gênent pas).
        assert connexion.execute(text("SELECT count(*) FROM users")).scalar() == 1
        assert connexion.execute(text("SELECT token_hash FROM auth_tokens")).scalars().all() == ["a" * 64]
        assert connexion.execute(text("SELECT count(*) FROM access_log_entries")).scalar() == 1
        # La séparation des foyers revient avec les données.
        assert connexion.execute(text("SELECT relforcerowsecurity FROM pg_class WHERE relname = 'holdings'")).scalar() is True
        politiques_restaurees = connexion.execute(text("SELECT count(*) FROM pg_policies")).scalar()
    with database.engine.connect() as connexion:
        assert politiques_restaurees == connexion.execute(text("SELECT count(*) FROM pg_policies")).scalar() > 0


@_POSTGRES
def test_restaurer_remplace_la_base_entiere_et_garde_une_copie_de_la_precedente(deux_foyers, base_de_restauration, tmp_path):
    url_restauration, moteur_lecture = base_de_restauration
    dossier = tmp_path / "sauvegardes"
    archive = sauvegarde.sauvegarder_postgres(database.DATABASE_URL, dossier)
    sauvegarde.restaurer_postgres(archive, url_restauration, dossier)

    # La base restaurée vit sa vie : une ligne change, une migration postérieure
    # ajoute une table.
    moteur_application = create_engine(url_restauration)
    with moteur_application.begin() as connexion:
        connexion.execute(text("SELECT set_config('app.tous_foyers', 'on', true)"))
        connexion.execute(text("UPDATE holdings SET ticker = 'MODIFIE' WHERE ticker = 'A-SEUL'"))
        connexion.execute(text("CREATE TABLE table_posterieure (id integer)"))
    moteur_application.dispose()

    mise_de_cote = sauvegarde.restaurer_postgres(archive, url_restauration, dossier)

    with moteur_lecture.connect() as connexion:
        assert connexion.execute(text("SELECT ticker FROM holdings ORDER BY ticker")).scalars().all() == ["A-SEUL", "B-SEUL"]
        assert connexion.execute(text("SELECT to_regclass('public.table_posterieure')")).scalar() is None
    # La base remplacée n'est pas perdue : sa copie porte la modification.
    assert any("MODIFIE" in ligne for ligne in _lignes_archivees(mise_de_cote, "holdings"))
