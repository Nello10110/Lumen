import type fr from '../fr/dashboardPage'
import type { Structure } from '../../types'

/** Anglais — espace « dashboardPage » (backlog § BL.2), traduit depuis le français. */
const dashboardPage: Structure<typeof fr> = {
  tableauDeBord: "Dashboard",
  actualisation: "Refreshing...",
  actualiser: "Refresh",
  aucunePositionDansLePortefeuille: "No position in the portfolio. Start by",
  importerTonPortefeuille: "importing your portfolio",
  actualiserLesCours: "Refresh prices",
  repartitionsRentabiliteQualiteDesDonnees: "Allocations, returns, data quality and income have their own screen:",
  voirLAnalyseDetaillee: "see the detailed analysis",
  coursNonActualises: { one: "Your prices have not been refreshed for {n} day — refresh them?", other: "Your prices have not been refreshed for {n} days — refresh them?" },
}

export default dashboardPage
