import type fr from '../fr/alerteFraicheurCard'
import type { Structure } from '../../types'

/** Italien — espace « alerteFraicheurCard » (backlog § BL.2), traduit depuis le français. */
const alerteFraicheurCard: Structure<typeof fr> = {
  donneesARafraichir: "Dati da aggiornare",
  nonMiseAJourDepuis: ") — non aggiornato dal",
  jours: "giorni)",
}

export default alerteFraicheurCard
