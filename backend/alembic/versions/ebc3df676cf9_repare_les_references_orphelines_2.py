"""repare les references orphelines (2)

Revision ID: ebc3df676cf9
Revises: 47651f844317
Create Date: 2026-09-23 10:22:33.956584

"""
import logging
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'ebc3df676cf9'
down_revision: str | Sequence[str] | None = '47651f844317'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

logger = logging.getLogger("alembic.runtime.migration")

# Chaque référence entre tables métier, avec le traitement de sa ligne orpheline.
# L'ordre compte : les enfants d'une ligne supprimée ici passent avant elle.
#
# « supprimer » : la ligne n'a de sens que par ce qu'elle désigne (quotité, point
#   d'historique, règle) — ou bien elle RESTREINT une portée : un lien de partage ou
#   un périmètre d'invité mis à NULL voudrait dire « tout le foyer ». Jamais élargir.
# « détacher » : la ligne vit sans son rattachement (un emprunt sans bien, un
#   mouvement non catégorisé, une ligne « sans compte ») — mêmes règles que les
#   suppressions de l'application.
REPARATIONS: list[tuple[str, str, str, str]] = [
    # (table, colonne, table désignée, traitement)
    ("partage_acces", "lien_id", "liens_partage", "supprimer"),  # d'abord les accès des liens orphelins (ci-dessous)
    ("liens_partage", "detenteur_id", "detenteurs", "supprimer"),
    ("perimetres_invites", "detenteur_id", "detenteurs", "supprimer"),
    ("quotites_holdings", "detenteur_id", "detenteurs", "supprimer"),
    ("quotites_holdings", "holding_id", "holdings", "supprimer"),
    ("quotites_loans", "detenteur_id", "detenteurs", "supprimer"),
    ("quotites_loans", "loan_id", "loans", "supprimer"),
    ("salaires", "detenteur_id", "detenteurs", "detacher"),
    ("holding_valuation_history", "holding_id", "holdings", "supprimer"),
    ("holding_immobilier_details", "holding_id", "holdings", "supprimer"),
    ("loans", "holding_id", "holdings", "detacher"),
    ("loans", "etablissement_id", "etablissements", "detacher"),
    ("comptes", "etablissement_id", "etablissements", "detacher"),
    ("holdings", "compte_id", "comptes", "detacher"),
    ("transactions", "compte_id", "comptes", "detacher"),
    ("budget_cibles", "categorie_id", "categories_budget", "supprimer"),
    ("regles_categorisation", "categorie_id", "categories_budget", "supprimer"),
    ("mouvements_bancaires", "categorie_id", "categories_budget", "detacher"),
    ("categories_budget", "parent_id", "categories_budget", "detacher"),
]


def upgrade() -> None:
    """Répare les références pendantes que SQLite a laissé s'accumuler (§ BI.4).

    SQLite ne vérifie pas les clés étrangères (`PRAGMA foreign_keys` jamais activé) ;
    Postgres, si. Faire tourner la suite de tests sous Postgres a montré plusieurs
    suppressions qui laissaient des lignes pointées sur un id disparu — corrigées à
    la source dans le même lot. Les résidus déjà en base sont réparés ici, pour deux
    raisons :

    1. **Confidentialité.** SQLite redonne le plus grand id libéré au prochain
       enregistrement créé. Un lien de partage restreint à une personne supprimée
       désignait donc la PROCHAINE personne créée, et montrait publiquement son
       patrimoine ; un périmètre d'invité, de même. Ces lignes-là sont supprimées :
       les passer à NULL élargirait leur portée au foyer entier.
    2. **Portabilité.** Une base qui contient une seule référence pendante ne peut
       pas être transférée vers Postgres.

    Idempotente : sur une base saine, elle ne touche rien. Sous Postgres, qui n'a
    jamais admis ces références, elle ne trouve rien à faire."""
    connexion = op.get_bind()
    liens_orphelins = (
        "SELECT id FROM liens_partage WHERE detenteur_id IS NOT NULL "
        "AND detenteur_id NOT IN (SELECT id FROM detenteurs)"
    )
    # Les accès d'un lien sur le point d'être supprimé partent avant lui.
    connexion.execute(sa.text(f"DELETE FROM partage_acces WHERE lien_id IN ({liens_orphelins})"))
    for table, colonne, cible, traitement in REPARATIONS:
        condition = f"{colonne} IS NOT NULL AND {colonne} NOT IN (SELECT id FROM {cible})"
        if traitement == "supprimer":
            requete = f"DELETE FROM {table} WHERE {condition}"
        else:
            requete = f"UPDATE {table} SET {colonne} = NULL WHERE {condition}"
        nombre = connexion.execute(sa.text(requete)).rowcount
        if nombre:
            logger.warning("référence orpheline réparée : %s.%s → %s (%s ligne(s), %s)", table, colonne, cible, nombre, traitement)


def downgrade() -> None:
    """Irréversible par nature, comme `1e4d25f75711` : on ne peut pas réadresser une
    référence vers une ligne qui n'existe plus. Aucune opération."""
