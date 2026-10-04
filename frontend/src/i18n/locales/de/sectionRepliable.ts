import type fr from '../fr/sectionRepliable'
import type { Structure } from '../../types'

/** Allemand — espace « sectionRepliable » (backlog § BL.2), traduit depuis le français. */
const sectionRepliable: Structure<typeof fr> = {
  nErreurs: { one: "{n} Fehler", other: "{n} Fehler" },
}

export default sectionRepliable
