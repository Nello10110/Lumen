"""Verrouille la migration `d1a7c5e3b9f4` (§ BK.2b) : les tables des invitations se créent
sur une base à la révision précédente — sans toucher à ses données —, se défont
proprement, et se recréent. Le jeton n'y est jamais une colonne : seul son hachage."""

from datetime import datetime
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

import app.database as database_module
from alembic import command

_RACINE_BACKEND = Path(__file__).resolve().parent.parent
AVANT = "b8e4d2f6a1c9"
APRES = "d1a7c5e3b9f4"


@pytest.fixture
def base(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'scratch_migration_invitations.db'}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, AVANT)
    moteur = create_engine(url)
    yield cfg, moteur
    moteur.dispose()


def _tables(moteur) -> set[str]:
    return set(inspect(moteur).get_table_names())


def test_la_montee_cree_les_tables_et_garde_les_donnees(base):
    cfg, moteur = base
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO users (id, username, created_at, est_operateur) VALUES (1, 'paul', :d, 0)"), {"d": datetime(2026, 1, 1)})
        cx.execute(text("INSERT INTO foyers (id, langue, statut, cree_le) VALUES (1, 'fr', 'actif', :d)"), {"d": datetime(2026, 1, 1)})
    assert not {"invitations", "invitations_perimetres"} & _tables(moteur)

    command.upgrade(cfg, APRES)

    assert {"invitations", "invitations_perimetres"} <= _tables(moteur)
    colonnes = {c["name"]: c["nullable"] for c in inspect(moteur).get_columns("invitations")}
    assert "jeton" not in colonnes  # le jeton en clair n'est nulle part
    assert colonnes["jeton_hash"] is False
    assert colonnes["foyer_id"] is True  # invitation à créer un foyer, lot BK.2d
    unique = [i for i in inspect(moteur).get_indexes("invitations") if i["unique"]]
    assert [i["column_names"] for i in unique] == [["jeton_hash"]]
    with moteur.connect() as cx:
        assert cx.execute(text("SELECT username FROM users")).scalars().all() == ["paul"]


def test_le_jeton_hache_est_unique(base):
    cfg, moteur = base
    command.upgrade(cfg, APRES)
    ligne = {"h": "a" * 64, "d": datetime(2026, 1, 1)}
    insertion = text(
        "INSERT INTO invitations (role, jeton_hash, cree_le, expire_le) VALUES ('membre', :h, :d, :d)"
    )
    with moteur.begin() as cx:
        cx.execute(insertion, ligne)
    with pytest.raises(Exception, match="UNIQUE"), moteur.begin() as cx:
        cx.execute(insertion, ligne)


def test_la_descente_defait_les_tables_et_la_remontee_les_recree(base):
    cfg, moteur = base
    command.upgrade(cfg, APRES)

    command.downgrade(cfg, AVANT)
    assert not {"invitations", "invitations_perimetres"} & _tables(moteur)

    command.upgrade(cfg, APRES)
    assert {"invitations", "invitations_perimetres"} <= _tables(moteur)
