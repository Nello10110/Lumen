import type fr from '../fr/sectionRepliable'
import type { Structure } from '../../types'

/** Italien — espace « sectionRepliable » (backlog § BL.2), traduit depuis le français. */
const sectionRepliable: Structure<typeof fr> = {
  nErreurs: { one: "{n} errore", other: "{n} errori" },
}

export default sectionRepliable
