import type fr from '../fr/confirmationParSaisie'
import type { Structure } from '../../types'

/** Allemand — espace « confirmationParSaisie » (backlog § BK.2d), traduit depuis le français. */
const confirmationParSaisie: Structure<typeof fr> = {
  irreversible: "Diese Aktion kann nicht rückgängig gemacht werden.",
  confirmationLabel: "Zur Bestätigung gib „{phrase}“ ein",
  confirmationAria: "Bestätigung der Löschung",
  annuler: "Abbrechen",
}

export default confirmationParSaisie
