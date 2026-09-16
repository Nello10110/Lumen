"""retire_objectifs_suivis

Revision ID: 34e111af8a97
Revises: a1c9f3e7d2b4
Create Date: 2026-09-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34e111af8a97'
down_revision: Union[str, Sequence[str], None] = 'a1c9f3e7d2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('objectif_contributeurs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_objectif_contributeurs_objectif_id'))
        batch_op.drop_index(batch_op.f('ix_objectif_contributeurs_detenteur_id'))

    op.drop_table('objectif_contributeurs')
    with op.batch_alter_table('objectif_actifs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_objectif_actifs_objectif_id'))
        batch_op.drop_index(batch_op.f('ix_objectif_actifs_holding_id'))

    op.drop_table('objectif_actifs')
    with op.batch_alter_table('objectifs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_objectifs_user_id'))

    op.drop_table('objectifs')

    with op.batch_alter_table('liens_partage', schema=None) as batch_op:
        batch_op.drop_column('inclure_objectifs')


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('liens_partage', schema=None) as batch_op:
        batch_op.add_column(sa.Column('inclure_objectifs', sa.Boolean(), server_default='0', nullable=False))

    op.create_table('objectifs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('nom', sa.String(), nullable=False),
    sa.Column('type', sa.String(), nullable=False),
    sa.Column('montant_cible', sa.Float(), nullable=False),
    sa.Column('echeance', sa.String(), nullable=False),
    sa.Column('rendement_hypothese_pct', sa.Float(), nullable=False),
    sa.Column('valeur_a_la_creation', sa.Float(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('objectifs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_objectifs_user_id'), ['user_id'], unique=False)

    op.create_table('objectif_actifs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('objectif_id', sa.Integer(), nullable=False),
    sa.Column('holding_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['holding_id'], ['holdings.id'], ),
    sa.ForeignKeyConstraint(['objectif_id'], ['objectifs.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('objectif_id', 'holding_id', name='uq_objectif_actif')
    )
    with op.batch_alter_table('objectif_actifs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_objectif_actifs_holding_id'), ['holding_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_objectif_actifs_objectif_id'), ['objectif_id'], unique=False)

    op.create_table('objectif_contributeurs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('objectif_id', sa.Integer(), nullable=False),
    sa.Column('detenteur_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['detenteur_id'], ['detenteurs.id'], ),
    sa.ForeignKeyConstraint(['objectif_id'], ['objectifs.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('objectif_id', 'detenteur_id', name='uq_objectif_contributeur')
    )
    with op.batch_alter_table('objectif_contributeurs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_objectif_contributeurs_detenteur_id'), ['detenteur_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_objectif_contributeurs_objectif_id'), ['objectif_id'], unique=False)
