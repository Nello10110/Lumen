/** Libellés-DONNÉES (backlog § BL.3) : zones, secteurs, classes d'actif. Le serveur
 * les renvoie et les stocke en français — ce sont des valeurs, pas des textes
 * d'interface — ; `libelleDonnee()` (`i18n/donnees.ts`) les traduit à l'affichage
 * seulement. Chaque texte ici est donc AUSSI une valeur connue du serveur : ne pas
 * le reformuler sans changer `reference_indices.py`/`patrimoine_service.py`. */
const donnees = {
  ameriqueDuNord: 'Amérique du Nord',
  europe: 'Europe',
  japon: 'Japon',
  asiePacifique: 'Asie-Pacifique (hors Japon)',
  marchesEmergents: 'Marchés émergents',
  autresZones: 'Autres zones',
  technologies: "Technologies de l'information",
  financieres: 'Financières',
  sante: 'Santé',
  consommationDiscretionnaire: 'Consommation discrétionnaire',
  industrie: 'Industrie',
  communication: 'Communication',
  consommationDeBase: 'Consommation de base',
  energie: 'Énergie',
  materiaux: 'Matériaux',
  servicesPublics: 'Services publics',
  immobilier: 'Immobilier',
  autresSecteurs: 'Autres secteurs',
  nonCategorise: 'Non catégorisé',
  actions: 'Actions',
  etfFonds: 'ETF / Fonds',
  crypto: 'Crypto',
  obligations: 'Obligations',
  privateEquity: 'Private Equity',
  scpi: 'SCPI',
  assuranceVie: 'Assurance-vie',
  perEpargneRetraite: 'PER / Épargne retraite',
  compteCourant: 'Compte courant',
  epargneReglementee: 'Épargne réglementée',
  epargneSalariale: 'Épargne salariale',
  vehicule: 'Véhicule',
  autreActif: 'Autre actif',
  nonRenseigne: 'Non renseigné',
  dettesNonRattachees: 'Dettes non rattachées',
} as const

export default donnees
