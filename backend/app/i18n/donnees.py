"""Libellés-DONNÉES traduits à l'affichage côté serveur (backlog § BL.3/BL.4) : zones,
secteurs, classes d'actif — stockés et calculés en français, traduits seulement dans
un document produit (PDF). Même liste que `frontend/src/i18n/locales/fr/donnees.ts`,
et mêmes traductions : `tests/test_i18n_serveur.py` vérifie que les deux côtés
s'accordent, pour qu'un secteur ne porte pas deux noms selon qu'on le lit à l'écran
ou dans le relevé PDF."""

from . import a_traduire, traduire

LIBELLES_DONNEES = [
    a_traduire('Amérique du Nord'),
    a_traduire('Europe'),
    a_traduire('Japon'),
    a_traduire('Asie-Pacifique (hors Japon)'),
    a_traduire('Marchés émergents'),
    a_traduire('Autres zones'),
    a_traduire("Technologies de l'information"),
    a_traduire('Financières'),
    a_traduire('Santé'),
    a_traduire('Consommation discrétionnaire'),
    a_traduire('Industrie'),
    a_traduire('Communication'),
    a_traduire('Consommation de base'),
    a_traduire('Énergie'),
    a_traduire('Matériaux'),
    a_traduire('Services publics'),
    a_traduire('Immobilier'),
    a_traduire('Autres secteurs'),
    a_traduire('Non catégorisé'),
    a_traduire('Actions'),
    a_traduire('ETF / Fonds'),
    a_traduire('Crypto'),
    a_traduire('Obligations'),
    a_traduire('Private Equity'),
    a_traduire('SCPI'),
    a_traduire('Assurance-vie'),
    a_traduire('PER / Épargne retraite'),
    a_traduire('Compte courant'),
    a_traduire('Épargne réglementée'),
    a_traduire('Épargne salariale'),
    a_traduire('Véhicule'),
    a_traduire('Autre actif'),
    a_traduire('Non renseigné'),
    a_traduire('Dettes non rattachées'),
]


def libelle_donnee(valeur: str) -> str:
    """Valeur-donnée dans la langue de la requête ; inchangée si elle n'est pas une
    valeur connue (nom de compte, libellé saisi par l'utilisateur)."""
    return traduire(valeur)
