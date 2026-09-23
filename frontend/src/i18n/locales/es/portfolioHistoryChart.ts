import type fr from '../fr/portfolioHistoryChart'
import type { Structure } from '../../types'

/** Espagnol — espace « portfolioHistoryChart » (backlog § BL.2), traduit depuis le français. */
const portfolioHistoryChart: Structure<typeof fr> = {
  superposeLInvestiSousLe: "Superpone lo invertido bajo el total: la franja visible entre las dos curvas son las ganancias.",
  modeEtage: "Modo apilado",
  periodeDuGraphique: "Periodo del gráfico",
  pasEncoreDHistoriqueDisponible: "Todavía no hay historial disponible.",
  investi: "Invertido",
  gains: "Ganancias",
  periodeDuGraphiqueMobile: "Periodo del gráfico (móvil)",
  gainsInclutLesVentesRealisees: "«Ganancias» incluye las ventas realizadas, dividendos e intereses cobrados: la misma cifra que la Ganancia/Pérdida total de la tarjeta Rentabilidad global.",
  pourLImmobilierLEpargne: "Para inmuebles/ahorro, solo una aportación declarada explícitamente cuenta como «Invertido»; una subida no declarada se trata como ganancia.",
}

export default portfolioHistoryChart
