import type fr from '../fr/sessionsCard'
import type { Structure } from '../../types'

/** Anglais — espace « sessionsCard » (backlog § BL.2), traduit depuis le français. */
const sessionsCard: Structure<typeof fr> = {
  sessionsActives: "Active sessions",
  unAppareilOuNavigateurConnecte: "One connected device or browser per row. Revoking a session immediately logs out that device, without affecting the others.",
  ipInconnue: "Unknown IP",
  sessionActuelle: "(current session)",
  agentInconnu: "Unknown agent",
  derniereActivite: "· last activity",
  revoquer: "Revoke",
}

export default sessionsCard
