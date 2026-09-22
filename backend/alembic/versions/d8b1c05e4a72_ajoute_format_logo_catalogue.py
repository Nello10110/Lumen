"""ajoute format logo catalogue

Revision ID: d8b1c05e4a72
Revises: c7d4e91f6a38
Create Date: 2026-09-22 11:42:18.664201

Format réel du logo mis en cache pour une clé de catalogue (retour utilisateur du
22/09/2026 : « les logos de Ledger et Bricks.co ne sont pas trouvés ») — cf.
`models.LogoCatalogue.logo_format`. Bricks.co ne sert aucun raster, seulement un SVG :
le contenu du cache n'est donc plus systématiquement du PNG, et le type MIME du data
URI doit suivre.

Nullable sans valeur par défaut : les lignes déjà en cache sont toutes du PNG, et
`logo_service.data_uri_catalogue` lit `None` comme du PNG. Aucune reprise de données.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8b1c05e4a72'
down_revision: Union[str, Sequence[str], None] = 'c7d4e91f6a38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('logos_catalogue', sa.Column('logo_format', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('logos_catalogue', 'logo_format')
