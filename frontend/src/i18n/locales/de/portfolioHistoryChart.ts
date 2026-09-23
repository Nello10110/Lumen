import type fr from '../fr/portfolioHistoryChart'
import type { Structure } from '../../types'

/** Allemand — espace « portfolioHistoryChart » (backlog § BL.2), traduit depuis le français. */
const portfolioHistoryChart: Structure<typeof fr> = {
  superposeLInvestiSousLe: "Legt den investierten Betrag unter die Summe: das sichtbare Band zwischen beiden Kurven sind die Gewinne.",
  modeEtage: "Gestapelter Modus",
  periodeDuGraphique: "Zeitraum des Diagramms",
  pasEncoreDHistoriqueDisponible: "Noch keine Historie verfügbar.",
  investi: "Investiert",
  gains: "Gewinne",
  periodeDuGraphiqueMobile: "Zeitraum des Diagramms (mobil)",
  gainsInclutLesVentesRealisees: "„Gewinne“ umfasst realisierte Verkäufe, erhaltene Dividenden und Zinsen — dieselbe Zahl wie der Gesamtgewinn/-verlust auf der Karte Gesamtrendite.",
  pourLImmobilierLEpargne: "Bei Immobilien/Ersparnissen zählt nur eine ausdrücklich erfasste Einzahlung als „Investiert“ — ein nicht erfasster Anstieg gilt als Gewinn.",
}

export default portfolioHistoryChart
