"""mouvements bancaires rattaches a un vrai compte (§ BM.1)

Revision ID: e3b7c5a9d1f2
Revises: d7b2e4c9a1f3
Create Date: 2026-09-28 10:00:00.000000

`mouvements_bancaires.compte` (texte libre) devient `compte_id`, une référence vers
`comptes`. Pas de reprise de l'ancien texte (décision de l'utilisateur : aucune donnée
à migrer) : les mouvements déjà en base restent sans compte. La politique de
séparation des foyers (`c3a8e1f0b6d2`) porte sur `user_id` et n'est pas touchée.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e3b7c5a9d1f2'
down_revision: str | Sequence[str] | None = 'd7b2e4c9a1f3'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('mouvements_bancaires', schema=None) as batch_op:
        batch_op.add_column(sa.Column('compte_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_mouvements_bancaires_compte_id'), ['compte_id'], unique=False)
        batch_op.create_foreign_key('fk_mouvements_bancaires_compte_id_comptes', 'comptes', ['compte_id'], ['id'])
        batch_op.drop_column('compte')


def downgrade() -> None:
    with op.batch_alter_table('mouvements_bancaires', schema=None) as batch_op:
        batch_op.add_column(sa.Column('compte', sa.VARCHAR(), nullable=True))
        batch_op.drop_constraint('fk_mouvements_bancaires_compte_id_comptes', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_mouvements_bancaires_compte_id'))
        batch_op.drop_column('compte_id')
