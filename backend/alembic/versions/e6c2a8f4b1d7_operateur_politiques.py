"""opérateur : quatrième état de périmètre, politiques de foyers, d'appartenances et d'invitations (§ BK.2d)

Revision ID: e6c2a8f4b1d7
Revises: d1a7c5e3b9f4
Create Date: 2026-09-30 18:00:00.000000

Aucun changement de schéma : `users.est_operateur` et `invitations.foyer_id` facultatif
existent déjà (BK.2a, BK.2b). Seules les politiques Postgres changent, pour trois tables :

- `foyers` : le compte opérateur (`app.operateur = on`, sans foyer courant) les lit tous et les
  modifie (suspendre, réactiver) ;
- `appartenances` : il les lit toutes et modifie leur rôle (désigner un nouveau propriétaire) ;
  la garde « jamais d'appartenance pour un compte opérateur » reste entière ;
- `invitations` : les invitations à CRÉER un foyer (`foyer_id` vide) n'appartiennent à aucun
  foyer. Elles sont à leur créateur — le propriétaire d'un foyer en mode « sur invitation », ou
  l'opérateur, qui les voit toutes. Les invitations d'un foyer restent celles de ce foyer.

Aucune politique des tables de patrimoine ne mentionne `app.operateur` : la base ne montre
aucune de leurs lignes à l'opérateur. Sous SQLite, rien à faire.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e6c2a8f4b1d7'
down_revision: str | Sequence[str] | None = 'd1a7c5e3b9f4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_FOYER = "NULLIF(current_setting('app.foyer_id', true), '')::int"
_UTILISATEUR = "NULLIF(current_setting('app.utilisateur_id', true), '')::int"
_TOUS = "coalesce(current_setting('app.tous_foyers', true), '') = 'on'"
_OPERATEUR = "coalesce(current_setting('app.operateur', true), '') = 'on'"

_SANS_OPERATEUR_EN_MEMBRE = "NOT EXISTS (SELECT 1 FROM users u WHERE u.id = appartenances.user_id AND u.est_operateur)"

# (lecture, écriture), avec l'opérateur.
_POLITIQUES = {
    "foyers": (
        f"{_TOUS} OR {_OPERATEUR} OR id = {_FOYER} OR id IN (SELECT foyer_id FROM appartenances)",
        f"{_TOUS} OR {_OPERATEUR} OR id = {_FOYER}",
    ),
    "appartenances": (
        f"{_TOUS} OR {_OPERATEUR} OR user_id = {_UTILISATEUR} OR foyer_id = {_FOYER}",
        f"({_TOUS} OR {_OPERATEUR} OR foyer_id = {_FOYER}) AND {_SANS_OPERATEUR_EN_MEMBRE}",
    ),
}
_CREATION_DE_FOYER = f"foyer_id IS NULL AND ({_OPERATEUR} OR cree_par = {_UTILISATEUR})"
_POLITIQUE_INVITATIONS = f"{_TOUS} OR foyer_id = {_FOYER} OR ({_CREATION_DE_FOYER})"

# Les politiques de `b8e4d2f6a1c9` et `d1a7c5e3b9f4`, pour la descente.
_POLITIQUES_PRECEDENTES = {
    "foyers": (f"{_TOUS} OR id = {_FOYER} OR id IN (SELECT foyer_id FROM appartenances)", f"{_TOUS} OR id = {_FOYER}"),
    "appartenances": (
        f"{_TOUS} OR user_id = {_UTILISATEUR} OR foyer_id = {_FOYER}",
        f"({_TOUS} OR foyer_id = {_FOYER}) AND {_SANS_OPERATEUR_EN_MEMBRE}",
    ),
    "invitations": (f"{_TOUS} OR foyer_id = {_FOYER}", f"{_TOUS} OR foyer_id = {_FOYER}"),
}


def _remplacer(table: str, lecture: str, ecriture: str) -> None:
    op.execute(sa.text(f"DROP POLICY separation_foyers ON {table}"))
    op.execute(sa.text(f"CREATE POLICY separation_foyers ON {table} USING ({lecture}) WITH CHECK ({ecriture})"))


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table, (lecture, ecriture) in _POLITIQUES.items():
        _remplacer(table, lecture, ecriture)
    _remplacer("invitations", _POLITIQUE_INVITATIONS, _POLITIQUE_INVITATIONS)


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table, (lecture, ecriture) in _POLITIQUES_PRECEDENTES.items():
        _remplacer(table, lecture, ecriture)
