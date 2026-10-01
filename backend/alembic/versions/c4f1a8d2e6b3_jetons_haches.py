"""jetons de session et de partage stockés en empreinte SHA-256 (§ BK.2e)

Revision ID: c4f1a8d2e6b3
Revises: a9d3c7e1b5f2
Create Date: 2026-10-01 16:00:00.000000

`auth_tokens.token` (clé primaire) et `liens_partage.token` (index unique) contenaient le jeton
EN CLAIR : une fuite de la base (sauvegarde, `pg_dump`, disque) donnait des sessions et des liens
de partage valides. Ils deviennent `token_hash`, l'empreinte SHA-256 du jeton — comme
`invitations.jeton_hash` et `liaisons_sso_en_attente.code_hash` —, par laquelle l'application
retrouve la ligne (`auth_service.hacher_jeton`). Un jeton a 256 bits d'entropie : un hachage rapide
suffit, et il doit être déterministe.

**Les valeurs existantes sont hachées en place** : le jeton que détient un navigateur ou un
destinataire de lien reste le même, et l'application en recalcule l'empreinte à chaque requête —
une session ouverte avant la montée de version reste valide, un lien déjà transmis aussi.

**Descente.** Une empreinte ne se défait pas : la descente rend les anciens noms de colonnes, mais
termine toutes les sessions (chacun se reconnecte) et révoque les liens de partage encore actifs
(les empreintes qu'ils contiennent ne sont pas des jetons : sans cette révocation, une empreinte
lue dans la base servirait de jeton).

- SQLite : reconstruction de la table (mode `batch`), en deux temps pour `liens_partage` — l'index
  créé dans le même lot que le renommage de la colonne qu'il cite n'est pas retrouvé par Alembic ;
- Postgres : `RENAME` de la colonne et de l'index.
"""
import hashlib
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c4f1a8d2e6b3'
down_revision: str | Sequence[str] | None = 'a9d3c7e1b5f2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _hacher_en_place(table: str) -> None:
    """Remplace chaque jeton de `table.token` par son empreinte. La clé primaire de `auth_tokens`
    est réécrite : le volume est celui des sessions des 30 derniers jours."""
    connexion = op.get_bind()
    for (jeton,) in connexion.execute(sa.text(f"SELECT token FROM {table}")).fetchall():
        empreinte = hashlib.sha256(jeton.encode("utf-8")).hexdigest()
        connexion.execute(sa.text(f"UPDATE {table} SET token = :empreinte WHERE token = :jeton"), {"empreinte": empreinte, "jeton": jeton})


def _renommer_sessions(avant: str, apres: str) -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute(sa.text(f"ALTER TABLE auth_tokens RENAME COLUMN {avant} TO {apres}"))
    else:
        with op.batch_alter_table("auth_tokens", recreate="always") as batch_op:
            batch_op.alter_column(avant, new_column_name=apres)


def _renommer_liens(avant: str, apres: str) -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute(sa.text(f"ALTER TABLE liens_partage RENAME COLUMN {avant} TO {apres}"))
        op.execute(sa.text(f"ALTER INDEX ix_liens_partage_{avant} RENAME TO ix_liens_partage_{apres}"))
    else:
        with op.batch_alter_table("liens_partage", recreate="always") as batch_op:
            batch_op.drop_index(f"ix_liens_partage_{avant}")
            batch_op.alter_column(avant, new_column_name=apres)
        with op.batch_alter_table("liens_partage", recreate="always") as batch_op:
            batch_op.create_index(f"ix_liens_partage_{apres}", [apres], unique=True)


def upgrade() -> None:
    _hacher_en_place("auth_tokens")
    _hacher_en_place("liens_partage")
    _renommer_sessions("token", "token_hash")
    _renommer_liens("token", "token_hash")


def downgrade() -> None:
    connexion = op.get_bind()
    connexion.execute(sa.text("DELETE FROM auth_tokens"))
    connexion.execute(
        sa.text("UPDATE liens_partage SET revoked_at = :maintenant WHERE revoked_at IS NULL"),
        {"maintenant": datetime.now(UTC).replace(tzinfo=None)},
    )
    _renommer_sessions("token_hash", "token")
    _renommer_liens("token_hash", "token")
