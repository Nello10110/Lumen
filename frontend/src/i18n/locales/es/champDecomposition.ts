import type fr from '../fr/champDecomposition'
import type { Structure } from '../../types'

/** Espagnol — espace « champDecomposition » (backlog § BL.2), traduit depuis le français. */
const champDecomposition: Structure<typeof fr> = {
  versement: "Aportación",
  plusValue: "Plusvalía",
  necessiteUnPointAnterieurConnu: "Requiere un punto anterior conocido",
  natureDuMontantSaisi: "Naturaleza del importe introducido",
  optionnel: "opcional",
  plusValueDeduite: "plusvalía deducida",
  versementDeduit: "aportación deducida",
}

export default champDecomposition
