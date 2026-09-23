import type fr from '../fr/holdingPriceHistoryChart'
import type { Structure } from '../../types'

/** Espagnol — espace « holdingPriceHistoryChart » (backlog § BL.2), traduit depuis le français. */
const holdingPriceHistoryChart: Structure<typeof fr> = {
  performanceHistorique: "Rentabilidad histórica",
  historiqueDeCoursNonDisponible: "Historial de cotizaciones no disponible para este título.",
  volatiliteAnnualisee: "Volatilidad anualizada",
  perteMaximaleHistoriqueDrawdown: "Pérdida máxima histórica (drawdown)",
}

export default holdingPriceHistoryChart
