import type fr from '../fr/alerteFraicheurCard'
import type { Structure } from '../../types'

/** Allemand — espace « alerteFraicheurCard » (backlog § BL.2), traduit depuis le français. */
const alerteFraicheurCard: Structure<typeof fr> = {
  donneesARafraichir: "Zu aktualisierende Daten",
  nonMiseAJourDepuis: ") — nicht aktualisiert seit",
  jours: "Tagen)",
}

export default alerteFraicheurCard
