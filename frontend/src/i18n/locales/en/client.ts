import type fr from '../fr/client'
import type { Structure } from '../../types'

/** Anglais — espace « client » (backlog § BL.2), traduit depuis le français. */
const client: Structure<typeof fr> = {
  erreurReseau: "Unable to reach the server. Check your connection and try again.",
  introuvable: "The requested resource was not found.",
  tropVolumineux: "The file sent is too large.",
  tropDeRequetes: "Too many requests in a short time. Please wait before trying again.",
  erreurInterne: "An internal server error occurred. Please try again later.",
  erreurInattendue: "An unexpected error occurred ({statut}).",
  portailExpire: "The session with the authentication portal has expired. Reload the page to log back in.",
}

export default client
