import type fr from '../fr/performanceCard'
import type { Structure } from '../../types'

/** Anglais — espace « performanceCard » (backlog § BL.2), traduit depuis le français. */
const performanceCard: Structure<typeof fr> = {
  rentabiliteGlobale: "Overall return",
  valeurTotale: "Total value",
  coutTotalInvesti: "Total invested cost",
  depuisLe: "since",
  gainPerteTotal: "Total gain / loss",
  rendementAnnualise: "Annualized return",
  rendementMoneyWeightedXirr: "money-weighted return (XIRR)",
  dividendesPercusNet: "Dividends received (net)",
  interetsPercusNet: "Interest received (net)",
  autresRevenus: "Other income",
  fraisPayes: "Fees paid",
  impotsPreleves: "Taxes withheld",
  gainsRealisesVentes: "Realized gains (sales)",
}

export default performanceCard
