"""user_id devient foyer_id sur les 13 tables de patrimoine (§ BK.2e)

Revision ID: a9d3c7e1b5f2
Revises: f7d3b9a5c2e8
Create Date: 2026-10-01 14:00:00.000000

Depuis BK.2a, la colonne `user_id` des 13 tables de patrimoine désigne le FOYER (clé
étrangère vers `foyers.id`), pas un compte. Ce lot rend au nom sa vérité : `foyer_id`, avec
ses index, ses contraintes d'unicité et sa clé étrangère. Aucune donnée n'est réécrite, aucun
identifiant ne change.

Ne sont PAS renommées les colonnes `user_id` qui désignent vraiment un compte :
`appartenances`, `perimetres_invites`, `auth_tokens`, `access_log_entries`,
`liaisons_sso_en_attente` (clé étrangère vers `users.id`).

- SQLite : reconstruction de la table (mode `batch`), qui renomme la colonne et refait ses
  index, son unicité et sa clé étrangère sous leur nouveau nom ;
- Postgres : `RENAME` (la colonne, ses index, ses contraintes), et la politique de séparation
  des foyers (RLS, `c3a8e1f0b6d2`) est recréée avec la nouvelle colonne. Les politiques des
  tables filles (`quotites_*`, `holding_*`, `partage_acces`, `perimetres_invites`) passent par
  l'`id` de leur parent et ne mentionnent pas la colonne : elles ne changent pas.

Descente symétrique : le nom `user_id` et les anciens noms d'index, de contraintes et de
clés étrangères.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a9d3c7e1b5f2'
down_revision: str | Sequence[str] | None = 'f7d3b9a5c2e8'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Même liste que la séparation des foyers (`c3a8e1f0b6d2`) et l'objet foyer (`b8e4d2f6a1c9`).
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

# Contraintes d'unicité : table -> (nom avant, nom après, colonnes ; `@` = la colonne de foyer).
UNICITES = {
    "holdings": ("uq_holding_user_ticker_compte", "uq_holding_foyer_ticker_compte", ["@", "ticker", "compte_id"]),
    "transactions": (
        "uq_transaction_user_transaction_id",
        "uq_transaction_foyer_transaction_id",
        ["transaction_id", "@"],
    ),
    "comptes": ("uq_compte_user_nom", "uq_compte_foyer_nom", ["@", "nom"]),
    "etablissements": ("uq_etablissement_user_nom", "uq_etablissement_foyer_nom", ["@", "nom"]),
    "categories_budget": (
        "uq_categorie_budget_user_nom_parent",
        "uq_categorie_budget_foyer_nom_parent",
        ["@", "nom", "parent_id"],
    ),
    "mouvements_bancaires": (
        "uq_mouvement_bancaire_user_txid",
        "uq_mouvement_bancaire_foyer_txid",
        ["@", "transaction_id"],
    ),
    "budget_cibles": ("uq_budget_cible_user_categorie", "uq_budget_cible_foyer_categorie", ["@", "categorie_id"]),
    "journal_import": ("uq_journal_import_user_source", "uq_journal_import_foyer_source", ["@", "source"]),
}

# Index composite en plus de l'index `ix_{table}_{colonne}` de chaque table.
INDEX_COMPOSITES = {"transactions": ("ix_transactions_user_id_date", "ix_transactions_foyer_id_date", ["@", "date"])}

_FOYER = "NULLIF(current_setting('app.foyer_id', true), '')::int"
_TOUS = "coalesce(current_setting('app.tous_foyers', true), '') = 'on'"

_CONVENTION = {"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"}


def _colonnes(colonnes: list[str], colonne_foyer: str) -> list[str]:
    return [colonne_foyer if c == "@" else c for c in colonnes]


def _nom_fk_actuel(table: str, colonne: str) -> str | None:
    """Le nom réel de la clé étrangère de `table.colonne` vers `foyers`, s'il existe
    (sous SQLite, une table créée sans nom n'en a pas : la convention de nommage du
    mode `batch` lui en donne un le temps de la reconstruction)."""
    return next(
        (
            fk["name"]
            for fk in sa.inspect(op.get_bind()).get_foreign_keys(table)
            if fk["constrained_columns"] == [colonne] and fk["referred_table"] == "foyers"
        ),
        None,
    )


def _sens(couple: tuple[str, str, list[str]] | None, montee: bool) -> tuple[str | None, str | None, list[str]]:
    """(nom avant, nom après, colonnes) d'une contrainte ou d'un index, dans le sens de la
    migration : `couple` est écrit pour la montée, la descente le prend à l'envers."""
    if couple is None:
        return None, None, []
    return (couple[0], couple[1], couple[2]) if montee else (couple[1], couple[0], couple[2])


def _renommer_sqlite(table: str, avant: str, apres: str) -> None:
    """Reconstruit `table` avec `avant` renommée `apres`, et ses index, son unicité et sa
    clé étrangère nommés d'après la nouvelle colonne."""
    montee = avant == "user_id"
    nom_fk = _nom_fk_actuel(table, avant) or f"fk_{table}_{avant}_foyers"
    uq_avant, uq_apres, uq_colonnes = _sens(UNICITES.get(table), montee)
    ci_avant, ci_apres, ci_colonnes = _sens(INDEX_COMPOSITES.get(table), montee)

    # Deux reconstructions : un index ou une contrainte créé dans le MÊME lot que le
    # renommage de la colonne qu'il cite n'est pas retrouvé par Alembic (KeyError).
    with op.batch_alter_table(table, recreate="always", naming_convention=_CONVENTION) as batch_op:
        batch_op.drop_index(f"ix_{table}_{avant}")
        if ci_avant:
            batch_op.drop_index(ci_avant)
        if uq_avant:
            batch_op.drop_constraint(uq_avant, type_="unique")
        batch_op.drop_constraint(nom_fk, type_="foreignkey")
        batch_op.alter_column(avant, new_column_name=apres)
    with op.batch_alter_table(table, recreate="always") as batch_op:
        if uq_apres:
            batch_op.create_unique_constraint(uq_apres, _colonnes(uq_colonnes, apres))
        batch_op.create_foreign_key(f"fk_{table}_{apres}_foyers", "foyers", [apres], ["id"])
        batch_op.create_index(f"ix_{table}_{apres}", [apres], unique=False)
        if ci_apres:
            batch_op.create_index(ci_apres, _colonnes(ci_colonnes, apres), unique=False)


def _renommer_postgres(table: str, avant: str, apres: str) -> None:
    """`RENAME` de la colonne, de ses index et de ses contraintes ; la politique de
    séparation des foyers, qui cite la colonne, est recréée."""
    montee = avant == "user_id"
    nom_fk = _nom_fk_actuel(table, avant)
    uq_avant, uq_apres, _ = _sens(UNICITES.get(table), montee)
    ci_avant, ci_apres, _ = _sens(INDEX_COMPOSITES.get(table), montee)

    op.execute(sa.text(f"DROP POLICY IF EXISTS separation_foyers ON {table}"))
    op.execute(sa.text(f"ALTER TABLE {table} RENAME COLUMN {avant} TO {apres}"))
    op.execute(sa.text(f"ALTER INDEX IF EXISTS ix_{table}_{avant} RENAME TO ix_{table}_{apres}"))
    if ci_avant:
        op.execute(sa.text(f"ALTER INDEX IF EXISTS {ci_avant} RENAME TO {ci_apres}"))
    if uq_avant and any(c["name"] == uq_avant for c in sa.inspect(op.get_bind()).get_unique_constraints(table)):
        # Renomme aussi l'index qui porte la contrainte.
        op.execute(sa.text(f"ALTER TABLE {table} RENAME CONSTRAINT {uq_avant} TO {uq_apres}"))
    if nom_fk is not None:
        op.execute(sa.text(f"ALTER TABLE {table} RENAME CONSTRAINT {nom_fk} TO fk_{table}_{apres}_foyers"))
    condition = f"{_TOUS} OR {apres} = {_FOYER}"
    op.execute(sa.text(f"CREATE POLICY separation_foyers ON {table} USING ({condition}) WITH CHECK ({condition})"))


def _renommer(avant: str, apres: str) -> None:
    if op.get_bind().dialect.name == "postgresql":
        for table in TABLES_DE_FOYER:
            _renommer_postgres(table, avant, apres)
    else:
        for table in TABLES_DE_FOYER:
            _renommer_sqlite(table, avant, apres)


def upgrade() -> None:
    _renommer("user_id", "foyer_id")


def downgrade() -> None:
    _renommer("foyer_id", "user_id")
