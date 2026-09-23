import type fr from '../fr/revenusSection'
import type { Structure } from '../../types'

/** Italien — espace « revenusSection » (backlog § BL.2), traduit depuis le français. */
const revenusSection: Structure<typeof fr> = {
  dividendes: "Dividendi",
  aucunDividendePercuPourL: "Nessun dividendo incassato per ora nelle operazioni importate.",
  dividendesPercus: "Dividendi incassati",
  sur: "su",
  moisDu: "mesi, dal",
  au: "al",
  parMois: "Per mese",
  detailDesDividendes: "Dettaglio dei dividendi",
  reduire: "Riduci",
  afficherMoisPrecedents: { one: "Mostra il mese precedente", other: "Mostra i {n} mesi precedenti" },
}

export default revenusSection
