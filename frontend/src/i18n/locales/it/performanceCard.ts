import type fr from '../fr/performanceCard'
import type { Structure } from '../../types'

/** Italien — espace « performanceCard » (backlog § BL.2), traduit depuis le français. */
const performanceCard: Structure<typeof fr> = {
  rentabiliteGlobale: "Rendimento complessivo",
  valeurTotale: "Valore totale",
  coutTotalInvesti: "Costo totale investito",
  depuisLe: "dal",
  gainPerteTotal: "Guadagno / perdita totale",
  rendementAnnualise: "Rendimento annualizzato",
  rendementMoneyWeightedXirr: "rendimento ponderato per il denaro (XIRR)",
  dividendesPercusNet: "Dividendi incassati (netti)",
  interetsPercusNet: "Interessi incassati (netti)",
  autresRevenus: "Altri redditi",
  fraisPayes: "Costi pagati",
  impotsPreleves: "Imposte trattenute",
  gainsRealisesVentes: "Guadagni realizzati (vendite)",
}

export default performanceCard
