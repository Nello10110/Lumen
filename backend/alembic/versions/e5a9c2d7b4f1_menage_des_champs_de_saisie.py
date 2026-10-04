"""ménage des champs de saisie jamais relus : fiche immobilière, devise d'une ligne, décote d'un véhicule (§ BN.1, lot 1)

Revision ID: e5a9c2d7b4f1
Revises: d8b3f1a7c5e2
Create Date: 2026-10-04 10:00:00.000000

Un audit du 04/10/2026 a relevé des champs que l'utilisateur renseigne mais que l'application ne
relit jamais. Décision du même jour : les retirer de bout en bout.

- `holding_immobilier_details` perd `type_location`, `nb_pieces`, `annee_construction` et `dpe` ;
- `holdings` perd `devise` (la fiche d'un actif lit la devise dans les données de marché, jamais
  sur la ligne) ;
- **un seul jeu de charges** : `holding_immobilier_details.simulation_charges_mensuelles`
  disparaît, le simulateur achat/location lit `charges_mensuelles`. Pour une résidence principale
  (`residence_principale` vrai) qui avait renseigné `simulation_charges_mensuelles`, la valeur
  est reportée dans `charges_mensuelles` : c'est celle que le simulateur lisait, il garde donc
  le même résultat. Les autres lignes gardent leur `charges_mensuelles` (la rentabilité d'un
  bien loué ne bouge pas) ;
- **la décote d'un véhicule** n'est plus saisie : `taux_pct` des lignes de type `VEHICLE` est
  remis à NULL (la colonne reste, elle sert aux livrets).

`valeur_estimee` n'est pas touchée : une valeur déjà présente sur un titre coté reste en base.

**Descente.** Les colonnes reviennent, VIDES (NULL) : leurs valeurs ont été supprimées, la
descente ne peut pas les reconstituer. Les charges reportées restent dans `charges_mensuelles`
(`simulation_charges_mensuelles` revient vide), et la décote des véhicules n'est pas rétablie.

SQLite : mode `batch` (reconstruction des tables). Postgres : `ALTER TABLE ... DROP COLUMN`.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e5a9c2d7b4f1'
down_revision: str | Sequence[str] | None = 'd8b3f1a7c5e2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    details = sa.table(
        'holding_immobilier_details',
        sa.column('residence_principale', sa.Boolean),
        sa.column('charges_mensuelles'),
        sa.column('simulation_charges_mensuelles'),
    )
    op.execute(
        sa.update(details)
        .where(details.c.residence_principale.is_(True), details.c.simulation_charges_mensuelles.is_not(None))
        .values(charges_mensuelles=details.c.simulation_charges_mensuelles)
    )
    holdings = sa.table('holdings', sa.column('type_actif', sa.String), sa.column('taux_pct'))
    op.execute(sa.update(holdings).where(holdings.c.type_actif == 'VEHICLE').values(taux_pct=None))

    with op.batch_alter_table('holding_immobilier_details', schema=None) as batch_op:
        batch_op.drop_column('type_location')
        batch_op.drop_column('nb_pieces')
        batch_op.drop_column('annee_construction')
        batch_op.drop_column('dpe')
        batch_op.drop_column('simulation_charges_mensuelles')
    with op.batch_alter_table('holdings', schema=None) as batch_op:
        batch_op.drop_column('devise')


def downgrade() -> None:
    with op.batch_alter_table('holdings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('devise', sa.String(), nullable=True))
    with op.batch_alter_table('holding_immobilier_details', schema=None) as batch_op:
        batch_op.add_column(sa.Column('type_location', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('nb_pieces', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('annee_construction', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('dpe', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('simulation_charges_mensuelles', sa.Numeric(precision=28, scale=2), nullable=True))
