import type fr from '../fr/client'
import type { Structure } from '../../types'

/** Italien — espace « client » (backlog § BL.2), traduit depuis le français. */
const client: Structure<typeof fr> = {
  erreurReseau: "Impossibile contattare il server. Verifichi la connessione e riprovi.",
  introuvable: "La risorsa richiesta non è stata trovata.",
  tropVolumineux: "Il file inviato è troppo grande.",
  tropDeRequetes: "Troppe richieste in poco tempo. Attenda prima di riprovare.",
  erreurInterne: "Si è verificato un errore interno del server. Riprovi più tardi.",
  erreurInattendue: "Si è verificato un errore imprevisto ({statut}).",
  portailExpire: "La sessione con il portale di autenticazione è scaduta. Ricarica la pagina per accedere di nuovo.",
}

export default client
