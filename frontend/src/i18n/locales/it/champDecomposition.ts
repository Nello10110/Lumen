import type fr from '../fr/champDecomposition'
import type { Structure } from '../../types'

/** Italien — espace « champDecomposition » (backlog § BL.2), traduit depuis le français. */
const champDecomposition: Structure<typeof fr> = {
  versement: "Versamento",
  plusValue: "Plusvalenza",
  necessiteUnPointAnterieurConnu: "Richiede un punto precedente noto",
  natureDuMontantSaisi: "Natura dell'importo inserito",
  optionnel: "facoltativo",
  plusValueDeduite: "plusvalenza ricavata",
  versementDeduit: "versamento ricavato",
}

export default champDecomposition
