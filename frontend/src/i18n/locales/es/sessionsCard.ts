import type fr from '../fr/sessionsCard'
import type { Structure } from '../../types'

/** Espagnol — espace « sessionsCard » (backlog § BL.2), traduit depuis le français. */
const sessionsCard: Structure<typeof fr> = {
  sessionsActives: "Sesiones activas",
  unAppareilOuNavigateurConnecte: "Un dispositivo o navegador conectado por línea. Revocar una sesión desconecta inmediatamente ese dispositivo, sin afectar a los demás.",
  ipInconnue: "IP desconocida",
  sessionActuelle: "(sesión actual)",
  agentInconnu: "Agente desconocido",
  derniereActivite: "· última actividad",
  revoquer: "Revocar",
}

export default sessionsCard
