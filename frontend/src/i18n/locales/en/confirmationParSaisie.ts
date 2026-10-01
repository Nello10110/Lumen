import type fr from '../fr/confirmationParSaisie'
import type { Structure } from '../../types'

/** Anglais — espace « confirmationParSaisie » (backlog § BK.2d), traduit depuis le français. */
const confirmationParSaisie: Structure<typeof fr> = {
  irreversible: "This action cannot be undone.",
  confirmationLabel: "To confirm, type “{phrase}”",
  confirmationAria: "Deletion confirmation",
  annuler: "Cancel",
}

export default confirmationParSaisie
