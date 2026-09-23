import type fr from '../fr/rafraichissementCoursIndicateur'
import type { Structure } from '../../types'

/** Italien — espace « rafraichissementCoursIndicateur » (backlog § BL.2), traduit depuis le français. */
const rafraichissementCoursIndicateur: Structure<typeof fr> = {
  rafraichissementDesCoursEnCours: "Aggiornamento delle quotazioni...",
  coursAJour: "Quotazioni aggiornate.",
  enCours: "Aggiornamento delle quotazioni... ({faites} / {total})",
  echecMotif: "Aggiornamento delle quotazioni non riuscito: {motif}",
  echec: "Aggiornamento delle quotazioni non riuscito.",
}

export default rafraichissementCoursIndicateur
