import type fr from '../fr/performanceCard'
import type { Structure } from '../../types'

/** Espagnol — espace « performanceCard » (backlog § BL.2), traduit depuis le français. */
const performanceCard: Structure<typeof fr> = {
  rentabiliteGlobale: "Rentabilidad global",
  valeurTotale: "Valor total",
  coutTotalInvesti: "Coste total invertido",
  depuisLe: "desde el",
  gainPerteTotal: "Ganancia / pérdida total",
  rendementAnnualise: "Rentabilidad anualizada",
  rendementMoneyWeightedXirr: "rentabilidad ponderada por capital (XIRR)",
  dividendesPercusNet: "Dividendos cobrados (netos)",
  interetsPercusNet: "Intereses cobrados (netos)",
  autresRevenus: "Otros ingresos",
  fraisPayes: "Comisiones pagadas",
  impotsPreleves: "Impuestos retenidos",
  gainsRealisesVentes: "Ganancias realizadas (ventas)",
}

export default performanceCard
