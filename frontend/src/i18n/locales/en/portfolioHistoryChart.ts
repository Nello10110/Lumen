import type fr from '../fr/portfolioHistoryChart'
import type { Structure } from '../../types'

/** Anglais — espace « portfolioHistoryChart » (backlog § BL.2), traduit depuis le français. */
const portfolioHistoryChart: Structure<typeof fr> = {
  superposeLInvestiSousLe: "Overlays the invested amount under the total: the visible band between the two curves is the gains.",
  modeEtage: "Stacked mode",
  periodeDuGraphique: "Chart period",
  pasEncoreDHistoriqueDisponible: "No history available yet.",
  investi: "Invested",
  gains: "Gains",
  periodeDuGraphiqueMobile: "Chart period (mobile)",
  gainsInclutLesVentesRealisees: "“Gains” includes realized sales, dividends and interest received — the same figure as the total Gain/Loss on the Overall return card.",
  pourLImmobilierLEpargne: "For real estate/savings, only an explicitly declared contribution counts as “Invested” — an undeclared increase is treated as a gain.",
}

export default portfolioHistoryChart
