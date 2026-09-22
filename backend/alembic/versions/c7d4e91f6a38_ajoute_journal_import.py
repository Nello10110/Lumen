"""ajoute journal import

Revision ID: c7d4e91f6a38
Revises: 51b2a3201f9a
Create Date: 2026-09-22 09:14:02.331904

Date du dernier import abouti par source de fichier (refonte de l'écran Import,
22/09/2026 : chaque tuile de source affiche « dernier import le ... ») — cf.
`models.JournalImport`. Table dédiée plutôt qu'une clé de `UserParametre` : ce n'est
pas un réglage choisi par l'utilisateur mais la trace d'un événement, et elle porte
un décompte de lignes en plus de la date.

Aucune reprise de l'existant : les imports antérieurs à cette révision n'ont laissé
aucune trace exploitable (ni `Transaction.created_at` ni `Holding` ne permettent de
reconstituer QUELLE source a été importée, ni quand pour Trade Republic). Les tuiles
afficheront donc « jamais importé » jusqu'au prochain import de chaque source.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d4e91f6a38'
down_revision: Union[str, Sequence[str], None] = '51b2a3201f9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'journal_import',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('importe_le', sa.DateTime(), nullable=False),
        sa.Column('nb_lignes', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'source', name='uq_journal_import_user_source'),
    )
    op.create_index(op.f('ix_journal_import_user_id'), 'journal_import', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_journal_import_user_id'), table_name='journal_import')
    op.drop_table('journal_import')
