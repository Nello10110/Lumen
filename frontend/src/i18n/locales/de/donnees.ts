import type fr from '../fr/donnees'
import type { Structure } from '../../types'

/** Allemand — espace « donnees » (backlog § BL.2), traduit depuis le français. */
const donnees: Structure<typeof fr> = {
  ameriqueDuNord: "Nordamerika",
  europe: "Europa",
  japon: "Japan",
  asiePacifique: "Asien-Pazifik (ohne Japan)",
  marchesEmergents: "Schwellenländer",
  autresZones: "Andere Regionen",
  technologies: "Informationstechnologie",
  financieres: "Finanzen",
  sante: "Gesundheitswesen",
  consommationDiscretionnaire: "Nicht-Basiskonsumgüter",
  industrie: "Industrie",
  communication: "Kommunikation",
  consommationDeBase: "Basiskonsumgüter",
  energie: "Energie",
  materiaux: "Roh- und Grundstoffe",
  servicesPublics: "Versorger",
  immobilier: "Immobilien",
  autresSecteurs: "Andere Sektoren",
  nonCategorise: "Nicht kategorisiert",
  actions: "Aktien",
  etfFonds: "ETFs / Fonds",
  crypto: "Krypto",
  obligations: "Anleihen",
  privateEquity: "Private Equity",
  scpi: "SCPI (Immobilienfonds)",
  assuranceVie: "Lebensversicherung",
  perEpargneRetraite: "PER / Altersvorsorge",
  compteCourant: "Girokonto",
  epargneReglementee: "Regulierte Sparkonten",
  epargneSalariale: "Mitarbeitersparen",
  vehicule: "Fahrzeug",
  autreActif: "Sonstiger Vermögenswert",
  nonRenseigne: "Nicht angegeben",
  dettesNonRattachees: "Nicht zugeordnete Schulden",
}

export default donnees
