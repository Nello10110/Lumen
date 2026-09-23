import type fr from '../fr/champDecomposition'
import type { Structure } from '../../types'

/** Anglais — espace « champDecomposition » (backlog § BL.2), traduit depuis le français. */
const champDecomposition: Structure<typeof fr> = {
  versement: "Contribution",
  plusValue: "Gain",
  necessiteUnPointAnterieurConnu: "Requires a known earlier point",
  natureDuMontantSaisi: "Nature of the amount entered",
  optionnel: "optional",
  plusValueDeduite: "deduced gain",
  versementDeduit: "deduced contribution",
}

export default champDecomposition
