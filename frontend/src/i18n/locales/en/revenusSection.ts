import type fr from '../fr/revenusSection'
import type { Structure } from '../../types'

/** Anglais — espace « revenusSection » (backlog § BL.2), traduit depuis le français. */
const revenusSection: Structure<typeof fr> = {
  dividendes: "Dividends",
  aucunDividendePercuPourL: "No dividend received yet in the imported transactions.",
  dividendesPercus: "Dividends received",
  sur: "over",
  moisDu: "months, from",
  au: "to",
  parMois: "By month",
  detailDesDividendes: "Dividend details",
  reduire: "Collapse",
  afficherMoisPrecedents: { one: "Show the previous month", other: "Show the previous {n} months" },
}

export default revenusSection
