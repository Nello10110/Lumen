import type fr from '../fr/miseAJourDisponible'
import type { Structure } from '../../types'

/** Italien — espace « miseAJourDisponible » (backlog § BL.2), traduit depuis le français. */
const miseAJourDisponible: Structure<typeof fr> = {
  miseAJourPrete: "Un aggiornamento è pronto.",
  actualiser: "Aggiorna",
  plusTard: "Più tardi",
}

export default miseAJourDisponible
