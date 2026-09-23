import type fr from '../fr/rafraichissementCoursIndicateur'
import type { Structure } from '../../types'

/** Anglais — espace « rafraichissementCoursIndicateur » (backlog § BL.2), traduit depuis le français. */
const rafraichissementCoursIndicateur: Structure<typeof fr> = {
  rafraichissementDesCoursEnCours: "Refreshing prices...",
  coursAJour: "Prices up to date.",
  enCours: "Refreshing prices... ({faites} / {total})",
  echecMotif: "Price refresh failed: {motif}",
  echec: "Price refresh failed.",
}

export default rafraichissementCoursIndicateur
