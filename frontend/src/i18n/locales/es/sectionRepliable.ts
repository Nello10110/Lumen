import type fr from '../fr/sectionRepliable'
import type { Structure } from '../../types'

/** Espagnol — espace « sectionRepliable » (backlog § BL.2), traduit depuis le français. */
const sectionRepliable: Structure<typeof fr> = {
  nErreurs: { one: "{n} error", other: "{n} errores" },
}

export default sectionRepliable
