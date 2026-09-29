"""Verrouille la migration `e3b7c5a9d1f2` (§ BM.1) : le texte libre
`mouvements_bancaires.compte` disparaît au profit de `compte_id`, sans perdre les
mouvements déjà en base, et la descente rétablit l'ancien schéma."""

from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

import app.database as database_module
from alembic import command

_RACINE_BACKEND = Path(__file__).resolve().parent.parent


def _colonnes(moteur) -> set[str]:
    return {c["name"] for c in inspect(moteur).get_columns("mouvements_bancaires")}


def test_migration_remplace_le_texte_libre_par_une_reference_au_compte(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'scratch_migration_compte.db'}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, "d7b2e4c9a1f3")

    moteur = create_engine(url)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO users (id, username, password_hash, created_at) VALUES (1, 'a', 'x', '2026-01-01')"))
        cx.execute(
            text(
                "INSERT INTO mouvements_bancaires (id, user_id, transaction_id, date, libelle, montant, compte, "
                "categorise_manuellement, created_at) VALUES (1, 1, 'tx-1', '2026-02-01', 'Loyer', -800, 'Compte joint', 0, '2026-02-01')"
            )
        )

    command.upgrade(cfg, "e3b7c5a9d1f2")

    assert "compte" not in _colonnes(moteur)
    assert "compte_id" in _colonnes(moteur)
    index = {i["name"] for i in inspect(moteur).get_indexes("mouvements_bancaires")}
    assert "ix_mouvements_bancaires_compte_id" in index
    cles = inspect(moteur).get_foreign_keys("mouvements_bancaires")
    assert any(fk["referred_table"] == "comptes" and fk["constrained_columns"] == ["compte_id"] for fk in cles)
    with moteur.connect() as cx:
        assert cx.execute(text("SELECT libelle, compte_id FROM mouvements_bancaires")).fetchall() == [("Loyer", None)]

    command.downgrade(cfg, "d7b2e4c9a1f3")

    assert "compte" in _colonnes(moteur)
    assert "compte_id" not in _colonnes(moteur)
    moteur.dispose()
