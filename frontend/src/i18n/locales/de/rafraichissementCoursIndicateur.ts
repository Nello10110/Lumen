import type fr from '../fr/rafraichissementCoursIndicateur'
import type { Structure } from '../../types'

/** Allemand — espace « rafraichissementCoursIndicateur » (backlog § BL.2), traduit depuis le français. */
const rafraichissementCoursIndicateur: Structure<typeof fr> = {
  rafraichissementDesCoursEnCours: "Kurse werden aktualisiert...",
  coursAJour: "Kurse aktuell.",
  enCours: "Kurse werden aktualisiert... ({faites} / {total})",
  echecMotif: "Kursaktualisierung fehlgeschlagen: {motif}",
  echec: "Kursaktualisierung fehlgeschlagen.",
}

export default rafraichissementCoursIndicateur
