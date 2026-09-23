"""Montants exacts : le type de colonne `Decimale` et ses règles (backlog § BI.1).

**Pourquoi `Decimal` et pas `float`.** Le flottant binaire ne sait pas écrire 2,675 :
il stocke 2,67499999…, et `round(2.675, 2)` rend 2,67. Ajoutez l'arrondi « au pair »
de Python, et 0,125 descend à 0,12 quand 0,135 monte à 0,14. Sur un relevé bancaire
ou une fiche de courtier, c'est un centime faux, et pas toujours dans le même sens.
Pendant des mois, ce bruit a été compensé au cas par cas — 150 appels à `round(` dans
19 services. Une `Decimal` représente exactement ce que l'utilisateur a saisi.

**Le type suit la SOURCE de la valeur.** Est en `Decimale` tout ce que l'utilisateur
saisit ou importe d'un relevé : montants, quantités, prix de transaction, PRU, taux,
quotités, surface. Reste en `Float` tout ce qui vient d'un fournisseur de données de
marché (yfinance, CoinGecko, JustETF) : cours, prix actuel, frais de gestion, poids
de composition. Ces valeurs-là sont des flottants binaires dès leur origine ; les
convertir en `Decimal` n'y ajouterait qu'une fausse exactitude. Là où une donnée de
marché rencontre un montant — une valorisation, quantité × cours —, la conversion
est explicite (`en_decimal`).

**Trois garanties tenues ici, pour que le reste du code n'ait pas à y penser :**

1. *Une colonne `Decimale` ne contient jamais autre chose qu'une `Decimal` à son
   échelle*, même en mémoire. SQLAlchemy ne convertit rien à l'affectation :
   `holding.quantite = 7.0` garderait un `float` jusqu'au prochain rechargement, et
   un même objet porterait tantôt l'un, tantôt l'autre selon son histoire. Un
   écouteur d'attribut convertit donc dès l'affectation — y compris dans le
   constructeur, où les tests passent des flottants littéraux partout.
2. *L'arrondi est commercial* (au demi supérieur, `ROUND_HALF_UP`), comme sur un
   relevé : à l'écriture en base, à la relecture, et pour tout `round()` appliqué à
   une `Decimal` dans l'application — le contexte décimal par défaut est réglé ici,
   une fois, avant que le moindre fil d'exécution ne démarre.
3. *La base ne décide de rien.* SQLite n'a pas de type décimal natif et stocke une
   colonne `NUMERIC` en `real` ; Postgres arrondit à sa façon. La valeur est donc
   déjà arrondie côté Python avant d'être écrite, et de nouveau à la relecture — le
   résultat est identique quel que soit le moteur. Vérifié sous SQLite : à l'échelle
   déclarée, la relecture restitue exactement la valeur écrite tant qu'elle tient en
   15 chiffres significatifs, ce qui couvre largement un patrimoine de foyer.
"""

import decimal
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import Numeric, event
from sqlalchemy.orm import Mapper
from sqlalchemy.types import TypeDecorator

# Garantie 2. `DefaultContext` sert de modèle à tout contexte créé ensuite, donc à
# chaque fil de travail du serveur ; le contexte du fil principal peut, lui, exister
# déjà (créé par une bibliothèque à son import) : réglé aussi.
decimal.DefaultContext.rounding = ROUND_HALF_UP
decimal.getcontext().rounding = ROUND_HALF_UP

ECHELLE_MONTANT = 2
ECHELLE_QUANTITE = 10  # crypto : 8 décimales courantes (satoshi), marge au-delà
ECHELLE_PRIX = 10
ECHELLE_TAUX = 6  # pourcentages : 33,333333 % pour une quotité d'un tiers

ZERO = Decimal("0")


def _pas(echelle: int) -> Decimal:
    return Decimal(1).scaleb(-echelle)


def en_decimal(valeur, echelle: int | None = None) -> Decimal | None:
    """`float`, `int`, texte ou `Decimal` -> `Decimal`, `None` -> `None`.

    Un `float` passe par sa représentation la plus courte (`repr`), jamais par sa
    valeur binaire exacte : `Decimal(0.1)` vaut 0,1000000000000000055511…, alors que
    l'utilisateur a saisi 0,1. Avec `echelle`, le résultat est arrondi
    commercialement à ce nombre de décimales."""
    if valeur is None:
        return None
    if isinstance(valeur, Decimal):
        resultat = valeur
    elif isinstance(valeur, float):
        resultat = Decimal(repr(valeur))
    else:
        resultat = Decimal(valeur)
    # `NaN` et l'infini ne sont jamais un montant : ce sont des artefacts de calcul. À
    # refuser bruyamment, car `quantize` ne le ferait pas — un `NaN` « silencieux » le
    # traverse sans lever, et serait écrit en base.
    if not resultat.is_finite():
        raise ValueError(f"Valeur non finie refusée pour une colonne décimale : {valeur!r}")
    return resultat if echelle is None else resultat.quantize(_pas(echelle), ROUND_HALF_UP)


def arrondir(valeur: Decimal, echelle: int = ECHELLE_MONTANT) -> Decimal:
    """Arrondi commercial explicite — au centime par défaut."""
    return valeur.quantize(_pas(echelle), ROUND_HALF_UP)


class Decimale(TypeDecorator):
    """Colonne décimale exacte à `echelle` décimales. `NUMERIC(28, echelle)` en base :
    28 chiffres significatifs, la précision par défaut du module `decimal`."""

    impl = Numeric
    cache_ok = True

    def __init__(self, echelle: int):
        super().__init__(precision=28, scale=echelle, asdecimal=True)
        self.echelle = echelle

    @property
    def python_type(self):
        return Decimal

    def process_bind_param(self, value, _dialect):
        return en_decimal(value, self.echelle)

    def process_result_value(self, value, _dialect):
        return en_decimal(value, self.echelle)


@event.listens_for(Mapper, "mapper_configured")
def _convertir_a_laffectation(mapper, classe) -> None:
    """Garantie 1 : branche la conversion sur chaque attribut `Decimale` de chaque
    modèle, au moment où SQLAlchemy configure ce modèle."""
    for propriete in mapper.column_attrs:
        type_colonne = propriete.columns[0].type
        if not isinstance(type_colonne, Decimale):
            continue

        def convertir(_cible, valeur, _ancienne, _initiateur, echelle=type_colonne.echelle):
            return en_decimal(valeur, echelle)

        event.listen(getattr(classe, propriete.key), "set", convertir, retval=True)
