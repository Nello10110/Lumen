"""ajoute_compte_id_sur_transactions

Revision ID: a1c9f3e7d2b4
Revises: db4ea30e560a
Create Date: 2026-09-14 00:00:00.000000

Provenance réelle par compte sur le grand livre (retour utilisateur du 14/09/2026 :
un même ticker détenu chez deux établissements différents — ex. BTC chez Ledger ET
chez Trade Republic — ne s'affichait que chez l'un des deux, `Holding` étant
reconstruit par TICKER SEUL). Cause racine : `Transaction` ne portait aucune colonne
de compte, seul `Holding.compte_id` (résolu a posteriori, "premier compte établi
gagne pour toujours") l'approximait. `compte_id` devient un fait porté directement
par la transaction, stampé à l'import — cf. `routers/transactions.py`.

Backfill EXACT (pas une approximation) : avant ce lot, un ticker ne pouvait
structurellement appartenir qu'à un seul compte par utilisateur (`rebuild_holdings`
ne créait qu'une ligne `Holding` par ticker) — donc le `compte_id` du `Holding`
actuel portant ce ticker EST la vérité historique de toutes ses transactions.
L'ambiguïté (même ticker, deux comptes) ne devient possible qu'à partir des imports
faits APRÈS ce lot.

`uq_holding_user_ticker_compte` : `Holding` n'avait jusqu'ici AUCUNE contrainte
d'unicité en base (seul un garde-fou applicatif dans `create_holding` empêchait un
doublon `(user_id, ticker)` à la saisie manuelle) — devient une vraie contrainte SQL
sur `(user_id, ticker, compte_id)`, désormais légitimement non-unique sur `ticker`
seul. SQLite traite chaque `NULL` de `compte_id` comme distinct des autres : plusieurs
lignes "sans compte" du même ticker restent chacune une position séparée, comme avant.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c9f3e7d2b4'
down_revision: Union[str, Sequence[str], None] = 'db4ea30e560a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('transactions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('compte_id', sa.Integer(), nullable=True))
        batch_op.create_index(batch_op.f('ix_transactions_compte_id'), ['compte_id'], unique=False)
        batch_op.create_foreign_key('fk_transactions_compte_id_comptes', 'comptes', ['compte_id'], ['id'])

    # Backfill lossless (cf. docstring du module) : une seule requête corrélée, pas
    # de boucle Python — un simple report 1:1 du `compte_id` déjà en place sur le
    # `Holding` portant ce ticker, pour ce même utilisateur.
    connexion = op.get_bind()
    connexion.execute(sa.text("""
        UPDATE transactions
        SET compte_id = (
            SELECT h.compte_id FROM holdings h
            WHERE h.user_id = transactions.user_id AND h.ticker = transactions.symbol
            LIMIT 1
        )
        WHERE symbol IS NOT NULL AND symbol != ''
    """))
    # Transactions sans `symbol` (mouvements de cash purs, intérêts...) restent
    # `compte_id = NULL` — elles ne participent à aucune position par ticker.

    with op.batch_alter_table('holdings', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_holding_user_ticker_compte', ['user_id', 'ticker', 'compte_id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('holdings', schema=None) as batch_op:
        batch_op.drop_constraint('uq_holding_user_ticker_compte', type_='unique')

    with op.batch_alter_table('transactions', schema=None) as batch_op:
        batch_op.drop_constraint('fk_transactions_compte_id_comptes', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_transactions_compte_id'))
        batch_op.drop_column('compte_id')
