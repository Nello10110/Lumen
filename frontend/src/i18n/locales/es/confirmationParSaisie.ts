import type fr from '../fr/confirmationParSaisie'
import type { Structure } from '../../types'

/** Espagnol — espace « confirmationParSaisie » (backlog § BK.2d), traduit depuis le français. */
const confirmationParSaisie: Structure<typeof fr> = {
  irreversible: "Esta acción es irreversible.",
  confirmationLabel: "Para confirmar, escribe «{phrase}»",
  confirmationAria: "Confirmación de la eliminación",
  annuler: "Cancelar",
}

export default confirmationParSaisie
