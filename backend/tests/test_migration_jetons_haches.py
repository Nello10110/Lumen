"""Verrouille la migration `c4f1a8d2e6b3` (§ BK.2e) : les jetons de session
(`auth_tokens`) et de partage (`liens_partage`) ne sont plus gardés en clair mais en empreinte
SHA-256 (`token_hash`). Les valeurs existantes sont hachées EN PLACE : le jeton que détient un
navigateur ou un destinataire de lien reste valide. La descente rend les anciens noms, termine
les sessions et révoque les liens (une empreinte ne se défait pas)."""

import hashlib
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session

import app.database as database_module
from alembic import command
from app.models import Base
from app.services import auth_service, partage_service

_RACINE_BACKEND = Path(__file__).resolve().parent.parent
AVANT = "a9d3c7e1b5f2"
APRES = "c4f1a8d2e6b3"

JETON_SESSION = "a" * 64
JETON_SESSION_EXPIREE = "b" * 64
JETON_LIEN = "c" * 64
JETON_LIEN_REVOQUE = "d" * 64


def _empreinte(jeton: str) -> str:
    return hashlib.sha256(jeton.encode("utf-8")).hexdigest()


@pytest.fixture
def base(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'scratch_migration_jetons.db'}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, AVANT)
    moteur = create_engine(url)
    yield cfg, moteur
    moteur.dispose()


def _peupler(moteur) -> None:
    maintenant = datetime.now().replace(microsecond=0)
    demain = maintenant + timedelta(days=1)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO foyers (id, nom, langue, statut, cree_le) VALUES (1, 'Foyer', 'fr', 'actif', :d)"), {"d": maintenant})
        cx.execute(
            text("INSERT INTO users (id, username, password_hash, created_at, est_operateur) VALUES (1, 'paul', 'x', :d, 0)"),
            {"d": maintenant},
        )
        for jeton, expire in ((JETON_SESSION, demain), (JETON_SESSION_EXPIREE, maintenant - timedelta(days=1))):
            cx.execute(
                text(
                    "INSERT INTO auth_tokens (token, user_id, foyer_id, id_session, created_at, expires_at, derniere_utilisation) "
                    "VALUES (:jeton, 1, 1, :id_session, :d, :expire, :d)"
                ),
                {"jeton": jeton, "id_session": jeton[:16], "d": maintenant, "expire": expire},
            )
        for id_, jeton, revoque in ((1, JETON_LIEN, None), (2, JETON_LIEN_REVOQUE, maintenant)):
            cx.execute(
                text(
                    "INSERT INTO liens_partage (id, token, foyer_id, nom, created_at, expires_at, revoked_at) "
                    "VALUES (:id, :jeton, 1, 'Pour la banque', :d, :expire, :revoque)"
                ),
                {"id": id_, "jeton": jeton, "d": maintenant, "expire": demain, "revoque": revoque},
            )


def test_la_montee_hache_les_jetons_en_place_et_la_session_reste_valide(base):
    cfg, moteur = base
    _peupler(moteur)

    command.upgrade(cfg, APRES)

    with moteur.connect() as cx:
        sessions = {ligne[0] for ligne in cx.execute(text("SELECT token_hash FROM auth_tokens"))}
        liens = {ligne[0] for ligne in cx.execute(text("SELECT token_hash FROM liens_partage"))}
    assert sessions == {_empreinte(JETON_SESSION), _empreinte(JETON_SESSION_EXPIREE)}
    assert liens == {_empreinte(JETON_LIEN), _empreinte(JETON_LIEN_REVOQUE)}
    # Aucune trace d'un jeton en clair, dans aucune colonne de ces deux tables.
    with moteur.connect() as cx:
        for table in ("auth_tokens", "liens_partage"):
            contenu = str(cx.execute(text(f"SELECT * FROM {table}")).fetchall())
            assert not any(jeton in contenu for jeton in (JETON_SESSION, JETON_SESSION_EXPIREE, JETON_LIEN, JETON_LIEN_REVOQUE))

    # Le jeton détenu par le navigateur, ou par le destinataire du lien, vaut toujours.
    with Session(moteur) as session:
        ouverte = auth_service.token_par_valeur(session, JETON_SESSION)
        assert ouverte is not None and (ouverte.user_id, ouverte.foyer_id, ouverte.id_session) == (1, 1, JETON_SESSION[:16])
        assert auth_service.token_par_valeur(session, JETON_SESSION_EXPIREE) is None
        assert partage_service.lien_valide_par_token(session, JETON_LIEN) is not None
        assert partage_service.lien_valide_par_token(session, JETON_LIEN_REVOQUE) is None
        # L'empreinte lue dans la base n'est pas un jeton.
        assert auth_service.token_par_valeur(session, _empreinte(JETON_SESSION)) is None


def test_le_schema_migre_est_celui_des_modeles(base):
    cfg, moteur = base
    command.upgrade(cfg, APRES)
    inspecteur = inspect(moteur)

    for table in ("auth_tokens", "liens_partage"):
        modele = Base.metadata.tables[table]
        colonnes = {c["name"] for c in inspecteur.get_columns(table)}
        assert colonnes == {c.name for c in modele.columns}, table
        assert {i["name"] for i in inspecteur.get_indexes(table)} == {i.name for i in modele.indexes}, table
    assert inspecteur.get_pk_constraint("auth_tokens")["constrained_columns"] == ["token_hash"]
    index_token = next(i for i in inspecteur.get_indexes("liens_partage") if i["column_names"] == ["token_hash"])
    assert index_token["unique"]


def test_la_descente_rend_les_anciens_noms_termine_les_sessions_et_revoque_les_liens(base):
    cfg, moteur = base
    _peupler(moteur)
    command.upgrade(cfg, APRES)

    command.downgrade(cfg, AVANT)

    inspecteur = inspect(moteur)
    assert "token" in {c["name"] for c in inspecteur.get_columns("auth_tokens")}
    assert "token" in {c["name"] for c in inspecteur.get_columns("liens_partage")}
    assert "ix_liens_partage_token" in {i["name"] for i in inspecteur.get_indexes("liens_partage")}
    with moteur.connect() as cx:
        assert cx.execute(text("SELECT COUNT(*) FROM auth_tokens")).scalar() == 0
        assert cx.execute(text("SELECT COUNT(*) FROM liens_partage WHERE revoked_at IS NULL")).scalar() == 0
        assert cx.execute(text("SELECT COUNT(*) FROM liens_partage")).scalar() == 2

    command.upgrade(cfg, APRES)
