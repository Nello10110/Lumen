import type fr from '../fr/patrimoineNetCard'
import type { Structure } from '../../types'

/** Espagnol — espace « patrimoineNetCard » (backlog § BL.2), traduit depuis le français. */
const patrimoineNetCard: Structure<typeof fr> = {
  patrimoineNet: "Patrimonio neto",
  patrimoineBrut: "Patrimonio bruto",
  patrimoineFinancier: "Patrimonio financiero",
  foyer: "Hogar",
  detenteurSelectionne: "Titular seleccionado",
  financier: "Financiero",
  actionsEtfCryptoObligations: "Acciones, ETF, cripto, bonos",
  immobilierEpargne: "Inmuebles y ahorro",
  biensAssurancesVieLivrets: "Inmuebles, seguros de vida, cuentas de ahorro",
  emprunts: "Préstamos",
  capitalRestantDu: "Capital pendiente",
  parTypeDInvestissement: "Por tipo de inversión",
  legendeFinancier: "cartera seguida, sin inmuebles/ahorro/deudas",
  legendeBrut: "patrimonio bruto seguido: inmuebles/ahorro valorados en sus últimos puntos conocidos, a veces espaciados",
  legendeNet: "patrimonio neto seguido: inmuebles/ahorro valorados en sus últimos puntos conocidos, a veces espaciados",
}

export default patrimoineNetCard
