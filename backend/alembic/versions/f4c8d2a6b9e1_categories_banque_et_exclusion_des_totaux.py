"""categories de la banque et exclusion des totaux (§ BM.3)

Revision ID: f4c8d2a6b9e1
Revises: e3b7c5a9d1f2
Create Date: 2026-09-29 10:00:00.000000

`categories_budget.exclue_des_totaux` : une catégorie dont les mouvements ne comptent
dans aucun total du budget (virements internes). `mouvements_bancaires.categorie_banque_id` :
la catégorie donnée par la banque, repli des règles de catégorisation. Aucune reprise :
les catégories existantes ne sont pas exclues, les mouvements déjà en base n'ont pas de
catégorie de la banque. La séparation des foyers (`c3a8e1f0b6d2`) porte sur `user_id`
et n'est pas touchée.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f4c8d2a6b9e1'
down_revision: str | Sequence[str] | None = 'e3b7c5a9d1f2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table('categories_budget', schema=None) as batch_op:
        batch_op.add_column(sa.Column('exclue_des_totaux', sa.Boolean(), server_default='0', nullable=False))

    with op.batch_alter_table('mouvements_bancaires', schema=None) as batch_op:
        batch_op.add_column(sa.Column('categorie_banque_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_mouvements_bancaires_categorie_banque_id'), ['categorie_banque_id'], unique=False)
        batch_op.create_foreign_key(
            'fk_mouvements_bancaires_categorie_banque_id_categories_budget', 'categories_budget', ['categorie_banque_id'], ['id']
        )


def downgrade() -> None:
    with op.batch_alter_table('mouvements_bancaires', schema=None) as batch_op:
        batch_op.drop_constraint('fk_mouvements_bancaires_categorie_banque_id_categories_budget', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_mouvements_bancaires_categorie_banque_id'))
        batch_op.drop_column('categorie_banque_id')

    with op.batch_alter_table('categories_budget', schema=None) as batch_op:
        batch_op.drop_column('exclue_des_totaux')
