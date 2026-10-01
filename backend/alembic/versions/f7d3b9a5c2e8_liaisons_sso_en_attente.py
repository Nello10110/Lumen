"""liaisons SSO en attente de confirmation (§ BK.2d)

Revision ID: f7d3b9a5c2e8
Revises: e6c2a8f4b1d7
Create Date: 2026-10-01 09:00:00.000000

Le rappel du fournisseur SSO ne lie plus l'identité au compte visé : il enregistre une liaison
en attente (10 minutes, usage unique, code haché), que le compte connecté confirme. Sans cela, un
lien d'autorisation tendu à un tiers liait SON identité au compte de l'attaquant. Table sans
séparation par foyer, comme `users` et `auth_tokens`.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f7d3b9a5c2e8'
down_revision: str | Sequence[str] | None = 'e6c2a8f4b1d7'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "liaisons_sso_en_attente",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code_hash", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("sub", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("nom", sa.String(), nullable=True),
        sa.Column("cree_le", sa.DateTime(), nullable=False),
        sa.Column("expire_le", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_liaisons_sso_en_attente_user_id_users"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_liaisons_sso_en_attente_code_hash", "liaisons_sso_en_attente", ["code_hash"], unique=True)
    op.create_index("ix_liaisons_sso_en_attente_user_id", "liaisons_sso_en_attente", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_liaisons_sso_en_attente_user_id", table_name="liaisons_sso_en_attente")
    op.drop_index("ix_liaisons_sso_en_attente_code_hash", table_name="liaisons_sso_en_attente")
    op.drop_table("liaisons_sso_en_attente")
