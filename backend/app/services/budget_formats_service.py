"""Formats de relevé bancaire CSV reconnus (§ BM.3) : un format se signe par des
en-têtes caractéristiques ; reconnu, il pré-remplit le mapping de colonnes de
l'import CSV — que l'utilisateur peut toujours modifier — et dit comment lire les
catégories que la banque y a mises.

Pour ajouter une banque : une entrée de plus dans `FORMATS`, rien d'autre."""

import re
from dataclasses import dataclass, field

from .budget_categories_service import normaliser


@dataclass(frozen=True)
class FormatBancaire:
    code: str
    nom: str  # nom propre de la banque, affiché tel quel : ne se traduit pas
    # En-têtes normalisés (`normaliser_entete`) qui doivent TOUS figurer dans le fichier.
    signature: frozenset[str]
    # Champ du mapping (`date_col`, `libelle_col`...) → en-tête normalisé de la colonne.
    mapping: dict[str, str]
    # Début (normalisé) des catégories qui ne classent rien : « A categoriser - … ».
    prefixes_a_categoriser: tuple[str, ...] = ()
    # Catégories racines (normalisées) créées exclues des totaux à leur premier import.
    categories_exclues: frozenset[str] = field(default_factory=frozenset)


def normaliser_entete(entete: str) -> str:
    return re.sub(r"\s+", " ", normaliser(entete))


# Caisse d'Épargne : export CSV de l'espace client. Le libellé retenu est « Libelle
# operation », le libellé complet (« CB ANTHROPIC CLAU FACT 180826 ») : c'est lui que
# l'utilisateur mappait jusqu'ici, donc l'identifiant de déduplication — un hash qui
# l'inclut — reste celui des mouvements déjà importés ; la clé de regroupement de
# § BM.2 sait en retirer les dates ; et les règles existantes, écrites sur ce texte,
# continuent de s'appliquer. « Libelle simplifie » fondrait des lignes distinctes
# (deux magasins d'une même enseigne) et changerait tous les identifiants.
# La date retenue est celle de comptabilisation, première colonne et toujours remplie,
# pour la même raison de stabilité des identifiants.
CAISSE_EPARGNE = FormatBancaire(
    code="caisse_epargne",
    nom="Caisse d'Épargne",
    signature=frozenset(
        {
            "date de comptabilisation",
            "libelle simplifie",
            "libelle operation",
            "type operation",
            "categorie",
            "sous categorie",
            "debit",
            "credit",
            "pointage operation",
        }
    ),
    mapping={
        "date_col": "date de comptabilisation",
        "libelle_col": "libelle operation",
        "debit_col": "debit",
        "credit_col": "credit",
        "categorie_col": "categorie",
        "sous_categorie_col": "sous categorie",
    },
    prefixes_a_categoriser=("a categoriser",),
    categories_exclues=frozenset({"transaction exclue"}),
)

FORMATS: tuple[FormatBancaire, ...] = (CAISSE_EPARGNE,)


def detecter_format(colonnes: list[str]) -> FormatBancaire | None:
    presentes = {normaliser_entete(c) for c in colonnes}
    return next((f for f in FORMATS if f.signature <= presentes), None)


def mapping_suggere(format_: FormatBancaire, colonnes: list[str]) -> dict[str, str]:
    """Mapping du format exprimé avec les en-têtes EXACTS du fichier, tels que l'écran
    de mapping et la confirmation les attendent."""
    par_entete = {normaliser_entete(c): c for c in colonnes}
    return {champ: par_entete[entete] for champ, entete in format_.mapping.items() if entete in par_entete}
