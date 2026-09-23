import type fr from '../fr/revenusSection'
import type { Structure } from '../../types'

/** Espagnol — espace « revenusSection » (backlog § BL.2), traduit depuis le français. */
const revenusSection: Structure<typeof fr> = {
  dividendes: "Dividendos",
  aucunDividendePercuPourL: "Todavía no se ha cobrado ningún dividendo en las operaciones importadas.",
  dividendesPercus: "Dividendos cobrados",
  sur: "en",
  moisDu: "meses, del",
  au: "al",
  parMois: "Por mes",
  detailDesDividendes: "Detalle de los dividendos",
  reduire: "Reducir",
  afficherMoisPrecedents: { one: "Mostrar el mes anterior", other: "Mostrar los {n} meses anteriores" },
}

export default revenusSection
