"""supprime_type_societe_de_detenteurs

Revision ID: 51b2a3201f9a
Revises: 9a91c3af63c9
Create Date: 2026-09-16 23:36:46.515103

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51b2a3201f9a'
down_revision: Union[str, Sequence[str], None] = '9a91c3af63c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('detenteurs', schema=None) as batch_op:
        batch_op.drop_column('type')


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('detenteurs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('type', sa.String(), nullable=True))
