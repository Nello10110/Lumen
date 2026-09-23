import type fr from '../fr/etatErreur'
import type { Structure } from '../../types'

/** Italien — espace « etatErreur » (backlog § BL.2), traduit depuis le français. */
const etatErreur: Structure<typeof fr> = {
  reessayer: "Riprova",
}

export default etatErreur
