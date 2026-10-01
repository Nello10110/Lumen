import type fr from '../fr/confirmationParSaisie'
import type { Structure } from '../../types'

/** Italien — espace « confirmationParSaisie » (backlog § BK.2d), traduit depuis le français. */
const confirmationParSaisie: Structure<typeof fr> = {
  irreversible: "Questa azione è irreversibile.",
  confirmationLabel: "Per confermare, digita «{phrase}»",
  confirmationAria: "Conferma dell'eliminazione",
  annuler: "Annulla",
}

export default confirmationParSaisie
