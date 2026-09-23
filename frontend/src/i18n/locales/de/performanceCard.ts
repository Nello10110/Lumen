import type fr from '../fr/performanceCard'
import type { Structure } from '../../types'

/** Allemand — espace « performanceCard » (backlog § BL.2), traduit depuis le français. */
const performanceCard: Structure<typeof fr> = {
  rentabiliteGlobale: "Gesamtrendite",
  valeurTotale: "Gesamtwert",
  coutTotalInvesti: "Investierte Gesamtkosten",
  depuisLe: "seit",
  gainPerteTotal: "Gesamtgewinn / -verlust",
  rendementAnnualise: "Annualisierte Rendite",
  rendementMoneyWeightedXirr: "kapitalgewichtete Rendite (XIRR)",
  dividendesPercusNet: "Erhaltene Dividenden (netto)",
  interetsPercusNet: "Erhaltene Zinsen (netto)",
  autresRevenus: "Sonstige Erträge",
  fraisPayes: "Gezahlte Gebühren",
  impotsPreleves: "Einbehaltene Steuern",
  gainsRealisesVentes: "Realisierte Gewinne (Verkäufe)",
}

export default performanceCard
