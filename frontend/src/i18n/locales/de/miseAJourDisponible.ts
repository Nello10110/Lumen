import type fr from '../fr/miseAJourDisponible'
import type { Structure } from '../../types'

/** Allemand — espace « miseAJourDisponible » (backlog § BL.2), traduit depuis le français. */
const miseAJourDisponible: Structure<typeof fr> = {
  miseAJourPrete: "Ein Update ist bereit.",
  actualiser: "Aktualisieren",
  plusTard: "Später",
}

export default miseAJourDisponible
