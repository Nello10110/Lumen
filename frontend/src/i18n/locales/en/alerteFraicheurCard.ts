import type fr from '../fr/alerteFraicheurCard'
import type { Structure } from '../../types'

/** Anglais — espace « alerteFraicheurCard » (backlog § BL.2), traduit depuis le français. */
const alerteFraicheurCard: Structure<typeof fr> = {
  donneesARafraichir: "Data to refresh",
  nonMiseAJourDepuis: ") — not updated since",
  jours: "days)",
}

export default alerteFraicheurCard
