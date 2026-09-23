import type fr from '../fr/client'
import type { Structure } from '../../types'

/** Espagnol — espace « client » (backlog § BL.2), traduit depuis le français. */
const client: Structure<typeof fr> = {
  erreurReseau: "No se puede contactar con el servidor. Compruebe su conexión e inténtelo de nuevo.",
  introuvable: "No se encuentra el recurso solicitado.",
  tropVolumineux: "El archivo enviado es demasiado grande.",
  tropDeRequetes: "Demasiadas solicitudes en poco tiempo. Espere antes de volver a intentarlo.",
  erreurInterne: "Se ha producido un error interno en el servidor. Inténtelo más tarde.",
  erreurInattendue: "Se ha producido un error inesperado ({statut}).",
  portailExpire: "La sesión con el portal de autenticación ha caducado. Recarga la página para volver a conectarte.",
}

export default client
