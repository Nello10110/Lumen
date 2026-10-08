import type fr from '../fr/miseAJourDisponible'
import type { Structure } from '../../types'

/** Espagnol — espace « miseAJourDisponible » (backlog § BL.2), traduit depuis le français. */
const miseAJourDisponible: Structure<typeof fr> = {
  miseAJourPrete: "Hay una actualización lista.",
  actualiser: "Actualizar",
  plusTard: "Más tarde",
}

export default miseAJourDisponible
