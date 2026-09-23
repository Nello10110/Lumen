import type fr from '../fr/alerteFraicheurCard'
import type { Structure } from '../../types'

/** Espagnol — espace « alerteFraicheurCard » (backlog § BL.2), traduit depuis le français. */
const alerteFraicheurCard: Structure<typeof fr> = {
  donneesARafraichir: "Datos que actualizar",
  nonMiseAJourDepuis: ") — sin actualizar desde el",
  jours: "días)",
}

export default alerteFraicheurCard
