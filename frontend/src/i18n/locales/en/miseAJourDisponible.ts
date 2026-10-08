import type fr from '../fr/miseAJourDisponible'
import type { Structure } from '../../types'

/** Anglais — espace « miseAJourDisponible » (backlog § BL.2), traduit depuis le français. */
const miseAJourDisponible: Structure<typeof fr> = {
  miseAJourPrete: "An update is ready.",
  actualiser: "Refresh",
  plusTard: "Later",
}

export default miseAJourDisponible
