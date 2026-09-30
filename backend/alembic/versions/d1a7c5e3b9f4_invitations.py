"""invitations : rejoindre un foyer par un lien à usage unique (§ BK.2b)

Revision ID: d1a7c5e3b9f4
Revises: b8e4d2f6a1c9
Create Date: 2026-09-30 10:00:00.000000

Deux tables : `invitations` (le jeton n'y figure que haché) et `invitations_perimetres`
(les détenteurs qu'une invitation de rôle `invite` ouvrira à l'acceptation).

Sous Postgres, les deux tables sont rattachées à leur foyer par une politique de
sécurité au niveau des lignes, comme celles de `b8e4d2f6a1c9`. L'acceptation d'une
invitation, qui précède l'appartenance, lève la restriction le temps de sa transaction
(`database.tous_les_foyers_le_temps`) ; la consultation publique fait de même, en
lecture seule.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd1a7c5e3b9f4'
down_revision: str | Sequence[str] | None = 'b8e4d2f6a1c9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_FOYER = "NULLIF(current_setting('app.foyer_id', true), '')::int"
_TOUS = "coalesce(current_setting('app.tous_foyers', true), '') = 'on'"

# Une invitation appartient à son foyer ; ses périmètres, à leur invitation (la
# sous-requête est elle-même filtrée par la politique de `invitations`).
_POLITIQUES = {
    "invitations": f"{_TOUS} OR foyer_id = {_FOYER}",
    "invitations_perimetres": f"{_TOUS} OR invitation_id IN (SELECT id FROM invitations)",
}


def upgrade() -> None:
    op.create_table(
        "invitations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("foyer_id", sa.Integer(), nullable=True),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("libelle", sa.String(), nullable=True),
        sa.Column("jeton_hash", sa.String(), nullable=False),
        sa.Column("cree_par", sa.Integer(), nullable=True),
        sa.Column("cree_le", sa.DateTime(), nullable=False),
        sa.Column("expire_le", sa.DateTime(), nullable=False),
        sa.Column("utilisee_le", sa.DateTime(), nullable=True),
        sa.Column("utilisee_par", sa.Integer(), nullable=True),
        sa.Column("revoquee_le", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["foyer_id"], ["foyers.id"], name="fk_invitations_foyer_id_foyers"),
        sa.ForeignKeyConstraint(["cree_par"], ["users.id"], name="fk_invitations_cree_par_users"),
        sa.ForeignKeyConstraint(["utilisee_par"], ["users.id"], name="fk_invitations_utilisee_par_users"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invitations_foyer_id", "invitations", ["foyer_id"], unique=False)
    op.create_index("ix_invitations_jeton_hash", "invitations", ["jeton_hash"], unique=True)
    op.create_table(
        "invitations_perimetres",
        sa.Column("invitation_id", sa.Integer(), nullable=False),
        sa.Column("detenteur_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["invitation_id"], ["invitations.id"], name="fk_invitations_perimetres_invitation_id_invitations"
        ),
        sa.ForeignKeyConstraint(["detenteur_id"], ["detenteurs.id"], name="fk_invitations_perimetres_detenteur_id_detenteurs"),
        sa.PrimaryKeyConstraint("invitation_id", "detenteur_id"),
    )
    op.create_index("ix_invitations_perimetres_detenteur_id", "invitations_perimetres", ["detenteur_id"], unique=False)

    if op.get_bind().dialect.name == "postgresql":
        for table, condition in _POLITIQUES.items():
            op.execute(sa.text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"))
            op.execute(sa.text(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY"))
            op.execute(sa.text(f"CREATE POLICY separation_foyers ON {table} USING ({condition}) WITH CHECK ({condition})"))


def downgrade() -> None:
    # Les politiques disparaissent avec les tables.
    op.drop_index("ix_invitations_perimetres_detenteur_id", table_name="invitations_perimetres")
    op.drop_table("invitations_perimetres")
    op.drop_index("ix_invitations_jeton_hash", table_name="invitations")
    op.drop_index("ix_invitations_foyer_id", table_name="invitations")
    op.drop_table("invitations")
