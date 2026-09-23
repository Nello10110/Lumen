import type fr from '../fr/holdingPriceHistoryChart'
import type { Structure } from '../../types'

/** Anglais — espace « holdingPriceHistoryChart » (backlog § BL.2), traduit depuis le français. */
const holdingPriceHistoryChart: Structure<typeof fr> = {
  performanceHistorique: "Historical performance",
  historiqueDeCoursNonDisponible: "Price history not available for this security.",
  volatiliteAnnualisee: "Annualized volatility",
  perteMaximaleHistoriqueDrawdown: "Maximum historical loss (drawdown)",
}

export default holdingPriceHistoryChart
