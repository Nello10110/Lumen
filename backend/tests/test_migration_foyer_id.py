"""Verrouille la migration `a9d3c7e1b5f2` (§ BK.2e) : `user_id` devient `foyer_id` sur les
13 tables de patrimoine — la colonne, ses index, son unicité, sa clé étrangère —, sans
réécrire une ligne ; les colonnes `user_id` qui désignent un compte restent en place. La
descente rétablit les anciens noms. Le schéma migré est celui que décrivent les modèles."""

from datetime import datetime
from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.schema import UniqueConstraint

import app.database as database_module
from alembic import command
from app.models import Base

_RACINE_BACKEND = Path(__file__).resolve().parent.parent
AVANT = "f7d3b9a5c2e8"
APRES = "a9d3c7e1b5f2"

TABLES_DE_FOYER = [
    "holdings",
    "transactions",
    "comptes",
    "etablissements",
    "detenteurs",
    "loans",
    "salaires",
    "categories_budget",
    "mouvements_bancaires",
    "regles_categorisation",
    "budget_cibles",
    "liens_partage",
    "journal_import",
]
# Ces colonnes `user_id` désignent un compte (clé étrangère vers `users.id`) : elles ne bougent pas.
TABLES_DE_COMPTE = ["appartenances", "perimetres_invites", "auth_tokens", "access_log_entries", "liaisons_sso_en_attente"]


@pytest.fixture
def base(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'scratch_migration_foyer_id.db'}"
    monkeypatch.setattr(database_module, "DATABASE_URL", url)
    cfg = Config(str(_RACINE_BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(_RACINE_BACKEND / "alembic"))
    cfg.set_main_option("sqlalchemy.url", url)
    command.upgrade(cfg, AVANT)
    moteur = create_engine(url)
    yield cfg, moteur
    moteur.dispose()


def _colonnes(moteur, table: str) -> set[str]:
    return {c["name"] for c in inspect(moteur).get_columns(table)}


def _peupler(moteur) -> None:
    maintenant = datetime(2026, 1, 1)
    with moteur.begin() as cx:
        cx.execute(text("INSERT INTO foyers (id, nom, langue, statut, cree_le) VALUES (1, 'Foyer', 'fr', 'actif', :d)"), {"d": maintenant})
        cx.execute(text("INSERT INTO comptes (id, user_id, nom, created_at, updated_at) VALUES (1, 1, 'PEA', :d, :d)"), {"d": maintenant})
        cx.execute(
            text(
                "INSERT INTO holdings (id, user_id, ticker, quantite, origine, created_at, updated_at, compte_id) "
                "VALUES (1, 1, 'AAPL', 3, 'manuel', :d, :d, 1)"
            ),
            {"d": maintenant},
        )
        cx.execute(
            text(
                "INSERT INTO transactions (id, user_id, transaction_id, datetime_utc, date, category, type, amount, fee, tax, created_at) "
                "VALUES (1, 1, 't1', :d, '2026-01-01', 'TRADE', 'BUY', 1, 0, 0, :d)"
            ),
            {"d": maintenant},
        )


def test_la_montee_renomme_la_colonne_sans_reecrire_les_lignes(base):
    cfg, moteur = base
    _peupler(moteur)

    command.upgrade(cfg, APRES)

    for table in TABLES_DE_FOYER:
        colonnes = _colonnes(moteur, table)
        assert "foyer_id" in colonnes and "user_id" not in colonnes, table
    for table in TABLES_DE_COMPTE:
        assert "user_id" in _colonnes(moteur, table), table
    with moteur.connect() as cx:
        assert cx.execute(text("SELECT id, foyer_id, ticker, compte_id FROM holdings")).fetchall() == [(1, 1, "AAPL", 1)]
        assert cx.execute(text("SELECT foyer_id, transaction_id FROM transactions")).fetchall() == [(1, "t1")]
        assert cx.execute(text("SELECT foyer_id, nom FROM comptes")).fetchall() == [(1, "PEA")]
        assert cx.execute(text("PRAGMA foreign_key_check")).fetchall() == []


def test_le_schema_migre_est_celui_des_modeles(base):
    """Index, contraintes d'unicité et clés étrangères portent les noms que déclarent les
    modèles — une base migrée et une base créée d'après les modèles ne diffèrent pas."""
    cfg, moteur = base
    command.upgrade(cfg, APRES)
    inspecteur = inspect(moteur)

    for table in TABLES_DE_FOYER:
        modele = Base.metadata.tables[table]
        # `liens_partage.token` n'a été renommée `token_hash` (et son index) que par la révision suivante
        # (`c4f1a8d2e6b3`, jetons hachés) : à cette révision, l'index porte encore l'ancien nom.
        index_attendus = {i.name.replace("token_hash", "token") for i in modele.indexes}
        assert {i["name"] for i in inspecteur.get_indexes(table)} == index_attendus, table
        unicites_attendues = {c.name for c in modele.constraints if isinstance(c, UniqueConstraint)}
        assert {u["name"] for u in inspecteur.get_unique_constraints(table)} == unicites_attendues, table
        fk_foyer = [fk for fk in inspecteur.get_foreign_keys(table) if fk["constrained_columns"] == ["foyer_id"]]
        assert [fk["referred_table"] for fk in fk_foyer] == ["foyers"], table
        assert [fk["name"] for fk in fk_foyer] == [f"fk_{table}_foyer_id_foyers"], table


def test_la_descente_rend_les_anciens_noms_et_garde_les_lignes(base):
    cfg, moteur = base
    _peupler(moteur)
    command.upgrade(cfg, APRES)

    command.downgrade(cfg, AVANT)

    inspecteur = inspect(moteur)
    for table in TABLES_DE_FOYER:
        colonnes = _colonnes(moteur, table)
        assert "user_id" in colonnes and "foyer_id" not in colonnes, table
        assert f"ix_{table}_user_id" in {i["name"] for i in inspecteur.get_indexes(table)}, table
        assert [fk["name"] for fk in inspecteur.get_foreign_keys(table) if fk["constrained_columns"] == ["user_id"]] == [
            f"fk_{table}_user_id_foyers"
        ], table
    assert {u["name"] for u in inspecteur.get_unique_constraints("holdings")} == {"uq_holding_user_ticker_compte"}
    assert "ix_transactions_user_id_date" in {i["name"] for i in inspecteur.get_indexes("transactions")}
    with moteur.connect() as cx:
        assert cx.execute(text("SELECT id, user_id, ticker FROM holdings")).fetchall() == [(1, 1, "AAPL")]

    command.upgrade(cfg, APRES)

    with moteur.connect() as cx:
        assert cx.execute(text("SELECT id, foyer_id, ticker FROM holdings")).fetchall() == [(1, 1, "AAPL")]
