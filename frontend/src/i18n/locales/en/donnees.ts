import type fr from '../fr/donnees'
import type { Structure } from '../../types'

/** Anglais — espace « donnees » (backlog § BL.2), traduit depuis le français. */
const donnees: Structure<typeof fr> = {
  ameriqueDuNord: "North America",
  europe: "Europe",
  japon: "Japan",
  asiePacifique: "Asia-Pacific (excl. Japan)",
  marchesEmergents: "Emerging markets",
  autresZones: "Other regions",
  technologies: "Information technology",
  financieres: "Financials",
  sante: "Health care",
  consommationDiscretionnaire: "Consumer discretionary",
  industrie: "Industrials",
  communication: "Communication services",
  consommationDeBase: "Consumer staples",
  energie: "Energy",
  materiaux: "Materials",
  servicesPublics: "Utilities",
  immobilier: "Real estate",
  autresSecteurs: "Other sectors",
  nonCategorise: "Uncategorized",
  actions: "Stocks",
  etfFonds: "ETFs / Funds",
  crypto: "Crypto",
  obligations: "Bonds",
  privateEquity: "Private equity",
  scpi: "SCPI (real estate funds)",
  assuranceVie: "Life insurance",
  perEpargneRetraite: "PER / Retirement savings",
  compteCourant: "Current account",
  epargneReglementee: "Regulated savings",
  epargneSalariale: "Employee savings",
  vehicule: "Vehicle",
  autreActif: "Other asset",
  nonRenseigne: "Not specified",
  dettesNonRattachees: "Unlinked debts",
}

export default donnees
