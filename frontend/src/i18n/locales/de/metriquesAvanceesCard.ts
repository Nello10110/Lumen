import type fr from '../fr/metriquesAvanceesCard'
import type { Structure } from '../../types'

/** Allemand — espace « metriquesAvanceesCard » (backlog § BL.2), traduit depuis le français. */
const metriquesAvanceesCard: Structure<typeof fr> = {
  metriquesDePerformanceAvancees: "Erweiterte Performance-Kennzahlen",
  leRendementAnnualiseAfficheCi: "Die oben gezeigte annualisierte Rendite (kapitalgewichtet, XIRR) bewertet Ihre Entscheidung — wann und wie viel Sie eingezahlt haben. Die",
  twr: "TWR",
  timeWeightedCiDessousNeutralise: "(zeitgewichtet, unten) neutralisiert den Effekt Ihrer Einzahlungen, um die Anlage selbst zu bewerten: Zwei Personen, die zur selben Zeit im selben Portfolio investiert sind, haben dieselbe TWR, auch bei unterschiedlichen Beträgen.",
  historiqueInsuffisantPourCalculerCes: "Zu wenig Historie, um diese Kennzahlen zu berechnen.",
  performanceDuPlacementCumulee: "Wertentwicklung der Anlage (kumuliert)",
  twrCumule: "Kumulierte TWR",
  performanceDuPlacementParAn: "Wertentwicklung der Anlage (pro Jahr)",
  twrAnnualise: "Annualisierte TWR",
  regulariteDuParcours: "Gleichmäßigkeit des Verlaufs",
  volatiliteAnnualisee: "Annualisierte Volatilität",
  pireChuteEssuyee: "Schlimmster erlittener Einbruch",
  perteMaximaleDrawdown: "Maximaler Verlust (Drawdown)",
  nonRecupereACeJour: "bis heute nicht aufgeholt",
  comparaisonAUnIndice: "Vergleich mit einem Index",
  choisirUnIndiceDeReference: "Referenzindex wählen",
  choisisUnIndicePourComparer: "Wähle einen Index, um die Entwicklung deines Portfolios (in %, seit Beginn der Erfassung) mit diesem Index im selben Zeitraum zu vergleichen.",
  recupereEnSemaines: { one: "in {n} Woche aufgeholt", other: "in {n} Wochen aufgeholt" },
}

export default metriquesAvanceesCard
