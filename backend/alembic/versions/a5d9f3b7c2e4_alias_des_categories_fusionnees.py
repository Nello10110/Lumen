"""alias des categories de budget fusionnees (§ BM.4)

Revision ID: a5d9f3b7c2e4
Revises: f4c8d2a6b9e1
Create Date: 2026-09-29 15:00:00.000000

`categories_budget.alias` : les noms des catégories fusionnées dans celle-ci, que l'import
d'un relevé consulte avant de créer une catégorie de la banque. Vide pour les catégories
existantes. La séparation des foyers (`c3a8e1f0b6d2`) porte sur `user_id` et n'est pas touchée.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a5d9f3b7c2e4'
down_revision: str | Sequence[str] | None = 'f4c8d2a6b9e1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('categories_budget', schema=None) as batch_op:
        batch_op.add_column(sa.Column('alias', sa.Text(), server_default='', nullable=False))


def downgrade() -> None:
    with op.batch_alter_table('categories_budget', schema=None) as batch_op:
        batch_op.drop_column('alias')
