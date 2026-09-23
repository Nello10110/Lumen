import type fr from '../fr/holdingPriceHistoryChart'
import type { Structure } from '../../types'

/** Italien — espace « holdingPriceHistoryChart » (backlog § BL.2), traduit depuis le français. */
const holdingPriceHistoryChart: Structure<typeof fr> = {
  performanceHistorique: "Rendimento storico",
  historiqueDeCoursNonDisponible: "Storico delle quotazioni non disponibile per questo titolo.",
  volatiliteAnnualisee: "Volatilità annualizzata",
  perteMaximaleHistoriqueDrawdown: "Perdita massima storica (drawdown)",
}

export default holdingPriceHistoryChart
