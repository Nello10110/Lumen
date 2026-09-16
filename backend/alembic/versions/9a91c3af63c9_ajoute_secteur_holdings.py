"""ajoute_secteur_holdings

Revision ID: 9a91c3af63c9
Revises: 34e111af8a97
Create Date: 2026-09-16 18:42:10.400783

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a91c3af63c9'
down_revision: Union[str, Sequence[str], None] = '34e111af8a97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('holdings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('secteur', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('holdings', schema=None) as batch_op:
        batch_op.drop_column('secteur')
