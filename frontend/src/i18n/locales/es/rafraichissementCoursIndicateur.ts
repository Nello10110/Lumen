import type fr from '../fr/rafraichissementCoursIndicateur'
import type { Structure } from '../../types'

/** Espagnol — espace « rafraichissementCoursIndicateur » (backlog § BL.2), traduit depuis le français. */
const rafraichissementCoursIndicateur: Structure<typeof fr> = {
  rafraichissementDesCoursEnCours: "Actualizando cotizaciones...",
  coursAJour: "Cotizaciones actualizadas.",
  enCours: "Actualizando cotizaciones... ({faites} / {total})",
  echecMotif: "Error al actualizar las cotizaciones: {motif}",
  echec: "Error al actualizar las cotizaciones.",
}

export default rafraichissementCoursIndicateur
