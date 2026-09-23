import type fr from '../fr/holdingPriceHistoryChart'
import type { Structure } from '../../types'

/** Allemand — espace « holdingPriceHistoryChart » (backlog § BL.2), traduit depuis le français. */
const holdingPriceHistoryChart: Structure<typeof fr> = {
  performanceHistorique: "Historische Wertentwicklung",
  historiqueDeCoursNonDisponible: "Kurshistorie für dieses Wertpapier nicht verfügbar.",
  volatiliteAnnualisee: "Annualisierte Volatilität",
  perteMaximaleHistoriqueDrawdown: "Maximaler historischer Verlust (Drawdown)",
}

export default holdingPriceHistoryChart
