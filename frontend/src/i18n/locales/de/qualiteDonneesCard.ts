import type fr from '../fr/qualiteDonneesCard'
import type { Structure } from '../../types'

/** Allemand — espace « qualiteDonneesCard » (backlog § BL.2), traduit depuis le français. */
const qualiteDonneesCard: Structure<typeof fr> = {
  qualiteDesDonnees: "Datenqualität",
  estimeeParIndice: "{pct} % des Portfoliowerts ({valeur}) haben eine aus dem abgebildeten Index geschätzte geografische Aufteilung, da keine detaillierte Zusammensetzung verfügbar ist.",
  nonCategorisee: "{pct} % des Portfoliowerts ({valeur}) haben keine geografischen Daten und erscheinen als „Nicht kategorisiert“.",
  sansCotation: "{valeur} ({pct} %) werden mangels verfügbarem Kurs zum Einstandspreis bewertet — dieser Wert fließt unverändert in den Diversifikationswert und die Umschichtungsbeträge in Euro ein.",
}

export default qualiteDonneesCard
