"""separation des foyers par la base (RLS)

Revision ID: c3a8e1f0b6d2
Revises: ebc3df676cf9
Create Date: 2026-09-23 11:05:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3a8e1f0b6d2'
down_revision: str | Sequence[str] | None = 'ebc3df676cf9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Réglages de transaction posés par l'application (`app/database.py`, § BI.5). Non
# définis, ou vides : aucune ligne de foyer n'est visible.
_FOYER = "NULLIF(current_setting('app.foyer_id', true), '')::int"
_UTILISATEUR = "NULLIF(current_setting('app.utilisateur_id', true), '')::int"
_TOUS = "coalesce(current_setting('app.tous_foyers', true), '') = 'on'"

# Tables dont `user_id` désigne le FOYER (`auth_service.id_foyer`).
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

# Tables sans `user_id` : rattachées au foyer par leur parent. La sous-requête sur le
# parent est elle-même filtrée par la politique du parent — une ligne fille n'est
# visible que si sa ligne parente l'est. `perimetres_invites` en fait partie : son
# `user_id` est l'INVITÉ, pas le foyer ; c'est son détenteur qui dit à quel foyer
# elle appartient.
TABLES_FILLES = [
    ("holding_valuation_history", "holding_id", "holdings"),
    ("holding_immobilier_details", "holding_id", "holdings"),
    ("quotites_holdings", "holding_id", "holdings"),
    ("quotites_loans", "loan_id", "loans"),
    ("partage_acces", "lien_id", "liens_partage"),
    ("perimetres_invites", "detenteur_id", "detenteurs"),
]

# Préfixes des clés d'historique propres à un foyer (`services/historique_cache.py`) :
# `historique_patrimoine:{foyer}:…`. Les autres clés (historique d'un titre, d'un
# indice de référence) sont des données de marché, communes à tous.
PREFIXES_CACHE_DE_FOYER = ("historique_portefeuille", "historique_patrimoine")

# Hors périmètre, volontairement : `users`, `auth_tokens`, `access_log_entries` (il
# faut les lire AVANT de savoir qui se connecte), les données de marché et les
# réglages d'installation (`parametres`, `scheduled_job_config`).


def _politiques() -> dict[str, str]:
    politiques = dict.fromkeys(TABLES_DE_FOYER, f"{_TOUS} OR user_id = {_FOYER}")
    for table, colonne, parent in TABLES_FILLES:
        politiques[table] = f"{_TOUS} OR {colonne} IN (SELECT id FROM {parent})"
    # Préférences : celles du foyer (méthode de coût, nom du foyer…) et celles du
    # membre connecté lui-même (assistant de première connexion déjà vu).
    politiques["user_parametres"] = f"{_TOUS} OR user_id = {_FOYER} OR user_id = {_UTILISATEUR}"
    prefixes = ", ".join(f"'{p}'" for p in PREFIXES_CACHE_DE_FOYER)
    politiques["historique_cache"] = (
        f"{_TOUS} OR split_part(cle, ':', 1) NOT IN ({prefixes}) "
        f"OR split_part(cle, ':', 2) = coalesce(current_setting('app.foyer_id', true), '')"
    )
    return politiques


def upgrade() -> None:
    """Sécurité au niveau des lignes (backlog § BI.5), sous Postgres seulement —
    SQLite ne la connaît pas, et une installation familiale n'a qu'un foyer.

    `FORCE` : la politique s'applique aussi au PROPRIÉTAIRE des tables, qui en est
    exempté par défaut — sans lui, une application connectée avec le rôle qui a créé
    le schéma (le cas le plus courant) ne serait protégée par rien. Seuls un
    superutilisateur ou un rôle `BYPASSRLS` y échappent encore : l'application le
    signale au démarrage (`app/database.py`)."""
    if op.get_bind().dialect.name != "postgresql":
        return
    for table, condition in _politiques().items():
        op.execute(sa.text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
        op.execute(sa.text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))
        op.execute(
            sa.text(f"CREATE POLICY separation_foyers ON {table} USING ({condition}) WITH CHECK ({condition})")
        )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in _politiques():
        op.execute(sa.text(f"DROP POLICY IF EXISTS separation_foyers ON {table}"))
        op.execute(sa.text(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY"))
        op.execute(sa.text(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY"))
