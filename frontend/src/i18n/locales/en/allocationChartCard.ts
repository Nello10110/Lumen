import type fr from '../fr/allocationChartCard'
import type { Structure } from '../../types'

/** Anglais — espace « allocationChartCard » (backlog § BL.2), traduit depuis le français. */
const allocationChartCard: Structure<typeof fr> = {
  agrandirLeGraphique: "Enlarge the chart",
  agrandir: "Enlarge",
  aucuneDonneeDeRepartitionDisponible: "No allocation data available.",
  ajouteDesPositionsAuPortefeuille: "Add positions to the portfolio, or check their geographic/sector classification on each security’s sheet.",
  fermer: "Close",
  valeurTotale: "Total value",
  categorie: "Category",
  valeur: "Value",
  reel: "Actual",
}

export default allocationChartCard
