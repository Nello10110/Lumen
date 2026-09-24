"""code stable des categories de budget par defaut (§ BL.3)

Revision ID: d7b2e4c9a1f3
Revises: c3a8e1f0b6d2
Create Date: 2026-09-24 10:00:00.000000

"""
import unicodedata
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd7b2e4c9a1f3'
down_revision: str | Sequence[str] | None = 'c3a8e1f0b6d2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Noms français des catégories par défaut au moment de la migration (toutes les
# installations existantes ont été créées en français) — copie figée plutôt qu'import
# de `budget_categories_service` : une migration ne doit pas changer de comportement
# quand le code de l'application évolue.
_CODES_PAR_NOM = {
    "logement": "logement",
    "transport": "transport",
    "alimentation": "alimentation",
    "loisirs": "loisirs",
    "sante": "sante",
    "epargne": "epargne",
    "revenus": "revenus",
    "autres": "autres",
}


def _normaliser(texte: str) -> str:
    return unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode("ascii").lower().strip()


def upgrade() -> None:
    op.add_column("categories_budget", sa.Column("code", sa.String(), nullable=True))
    # Rattrapage : une catégorie RACINE portant (casse et accents mis à part) le nom
    # d'une catégorie par défaut reçoit son code — c'était déjà ainsi que le taux
    # d'épargne et le reste à vivre les repéraient. Une seule par foyer et par code
    # (la plus ancienne), pour que la recherche par code reste sans ambiguïté.
    connexion = op.get_bind()
    lignes = connexion.execute(
        sa.text("SELECT id, user_id, nom FROM categories_budget WHERE parent_id IS NULL ORDER BY id")
    ).fetchall()
    deja: set[tuple[int, str]] = set()
    for identifiant, foyer, nom in lignes:
        code = _CODES_PAR_NOM.get(_normaliser(nom))
        if code is None or (foyer, code) in deja:
            continue
        deja.add((foyer, code))
        connexion.execute(sa.text("UPDATE categories_budget SET code = :code WHERE id = :id"), {"code": code, "id": identifiant})


def downgrade() -> None:
    with op.batch_alter_table("categories_budget") as batch:
        batch.drop_column("code")
