import type fr from '../fr/champDecomposition'
import type { Structure } from '../../types'

/** Allemand — espace « champDecomposition » (backlog § BL.2), traduit depuis le français. */
const champDecomposition: Structure<typeof fr> = {
  versement: "Einzahlung",
  plusValue: "Gewinn",
  necessiteUnPointAnterieurConnu: "Erfordert einen bekannten früheren Punkt",
  natureDuMontantSaisi: "Art des eingegebenen Betrags",
  optionnel: "optional",
  plusValueDeduite: "abgeleiteter Gewinn",
  versementDeduit: "abgeleitete Einzahlung",
}

export default champDecomposition
