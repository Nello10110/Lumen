"""montants en decimal

Revision ID: 47651f844317
Revises: d8b1c05e4a72
Create Date: 2026-09-23 05:38:32.752086

Backlog § BI.1 : les 32 colonnes que l'utilisateur saisit ou importe d'un relevé
(montants, quantités, prix de transaction, PRU, taux, quotités, surface) passent de
`FLOAT` à `NUMERIC(28, échelle)` ; les 7 colonnes de données de marché ou hors
finance restent en `FLOAT`. Cf. la docstring de `app/decimales.py` pour la règle.

**Les valeurs déjà stockées sont normalisées à leur échelle**, et pas seulement
relues arrondies. Une base existante peut contenir un montant à plus de deux
décimales — une contre-valeur EUR d'un export Ledger, `-123.456`. Relu par
l'application, il vaudra désormais -123,46 ; mais une somme calculée EN SQL
additionnerait encore la valeur brute, et les deux totaux pourraient diverger d'un
centime ou plus. Normaliser rend la base identique à ce que l'application en lit.

La normalisation se fait en Python et non par le `ROUND()` de SQLite : celui-ci
arrondit la valeur BINAIRE (2,67499999… -> 2,67) quand l'application arrondit la
valeur saisie (2,675 -> 2,68, arrondi commercial). La règle est recopiée ici plutôt
qu'importée de `app.decimales` : une migration reste figée, quel que soit le devenir
du code applicatif.

Sous SQLite, le mode batch recrée chaque table ; les clés étrangères n'y sont pas
appliquées (aucun `PRAGMA foreign_keys` dans `app/database.py`), il n'y a donc aucune
suppression en cascade à craindre pendant la recopie.
"""

from decimal import ROUND_HALF_UP, Decimal
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "47651f844317"
down_revision: Union[str, Sequence[str], None] = "d8b1c05e4a72"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

MONTANT, QUANTITE, PRIX, TAUX = 2, 10, 10, 6

# table -> [(colonne, échelle, nullable)]
COLONNES: dict[str, list[tuple[str, int, bool]]] = {
    "budget_cibles": [("montant_mensuel", MONTANT, False)],
    "holding_immobilier_details": [
        ("loyer_mensuel", MONTANT, True),
        ("charges_mensuelles", MONTANT, True),
        ("frais_annuels", MONTANT, True),
        ("frais_notaire", MONTANT, True),
        ("frais_travaux", MONTANT, True),
        ("frais_acquisition_autres", MONTANT, True),
        ("simulation_loyer_estime", MONTANT, True),
        ("simulation_taxe_habitation_annuelle", MONTANT, True),
        ("simulation_charges_mensuelles", MONTANT, True),
        ("surface_m2", MONTANT, True),
    ],
    "holding_valuation_history": [("valeur", MONTANT, False), ("versement", MONTANT, True)],
    "holdings": [
        ("quantite", QUANTITE, False),
        ("prix_revient_moyen", PRIX, True),
        ("valeur_estimee", MONTANT, True),
        ("taux_pct", TAUX, True),
        ("versement_mensuel", MONTANT, True),
    ],
    "loans": [
        ("capital_initial", MONTANT, False),
        ("taux_annuel_pct", TAUX, False),
        ("mensualite", MONTANT, False),
        ("capital_restant_du_manuel", MONTANT, True),
    ],
    "mouvements_bancaires": [("montant", MONTANT, False)],
    "quotites_holdings": [("quotite_pct", TAUX, False)],
    "quotites_loans": [("quotite_pct", TAUX, False)],
    "salaires": [("montant", MONTANT, False), ("taux_imposition_pct", TAUX, True)],
    "transactions": [
        ("shares", QUANTITE, True),
        ("price", PRIX, True),
        ("amount", MONTANT, False),
        ("fee", MONTANT, False),
        ("tax", MONTANT, False),
    ],
}


def _en_decimal(valeur) -> Decimal:
    """Même règle que `app.decimales.en_decimal` : un flottant passe par sa
    représentation la plus courte, jamais par sa valeur binaire exacte."""
    return Decimal(repr(valeur)) if isinstance(valeur, float) else Decimal(valeur)


def _normaliser_valeurs(table: str, colonnes: list[tuple[str, int, bool]]) -> None:
    connexion = op.get_bind()
    noms = ", ".join(nom for nom, _, _ in colonnes)
    for ligne in connexion.execute(sa.text(f"SELECT id, {noms} FROM {table}")).mappings():
        modifs = {}
        for nom, echelle, _ in colonnes:
            valeur = ligne[nom]
            if valeur is None:
                continue
            brute = _en_decimal(valeur)
            normalisee = brute.quantize(Decimal(1).scaleb(-echelle), ROUND_HALF_UP)
            if normalisee != brute:
                # Passée en texte parce que le pilote `sqlite3` ne sait pas lier une
                # `Decimal`. SQLite la reconvertit en réel binaire sous l'affinité
                # NUMERIC : c'est attendu, l'exactitude est rétablie à la relecture par
                # `Decimale`. Ce qui compte ici, c'est que le réel stocké soit désormais
                # le plus proche de -123,46, et non plus de -123,456.
                modifs[nom] = str(normalisee)
        if modifs:
            affectations = ", ".join(f"{nom} = :{nom}" for nom in modifs)
            connexion.execute(sa.text(f"UPDATE {table} SET {affectations} WHERE id = :id"), {**modifs, "id": ligne["id"]})


def upgrade() -> None:
    for table, colonnes in COLONNES.items():
        with op.batch_alter_table(table, schema=None) as batch_op:
            for nom, echelle, nullable in colonnes:
                batch_op.alter_column(
                    nom, existing_type=sa.FLOAT(), type_=sa.Numeric(precision=28, scale=echelle), existing_nullable=nullable
                )
        _normaliser_valeurs(table, colonnes)


def downgrade() -> None:
    for table, colonnes in COLONNES.items():
        with op.batch_alter_table(table, schema=None) as batch_op:
            for nom, echelle, nullable in colonnes:
                batch_op.alter_column(
                    nom, existing_type=sa.Numeric(precision=28, scale=echelle), type_=sa.FLOAT(), existing_nullable=nullable
                )
