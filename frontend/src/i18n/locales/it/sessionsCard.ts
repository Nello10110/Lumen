import type fr from '../fr/sessionsCard'
import type { Structure } from '../../types'

/** Italien — espace « sessionsCard » (backlog § BL.2), traduit depuis le français. */
const sessionsCard: Structure<typeof fr> = {
  sessionsActives: "Sessioni attive",
  unAppareilOuNavigateurConnecte: "Un dispositivo o browser connesso per riga. Revocare una sessione disconnette immediatamente quel dispositivo, senza toccare gli altri.",
  ipInconnue: "IP sconosciuto",
  sessionActuelle: "(sessione attuale)",
  agentInconnu: "Agente sconosciuto",
  derniereActivite: "· ultima attività",
  revoquer: "Revoca",
}

export default sessionsCard
