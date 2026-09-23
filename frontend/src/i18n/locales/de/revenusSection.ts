import type fr from '../fr/revenusSection'
import type { Structure } from '../../types'

/** Allemand — espace « revenusSection » (backlog § BL.2), traduit depuis le français. */
const revenusSection: Structure<typeof fr> = {
  dividendes: "Dividenden",
  aucunDividendePercuPourL: "Noch keine Dividende in den importierten Transaktionen erhalten.",
  dividendesPercus: "Erhaltene Dividenden",
  sur: "über",
  moisDu: "Monate, vom",
  au: "bis",
  parMois: "Pro Monat",
  detailDesDividendes: "Dividendendetails",
  reduire: "Einklappen",
  afficherMoisPrecedents: { one: "Vorherigen Monat anzeigen", other: "Vorherige {n} Monate anzeigen" },
}

export default revenusSection
