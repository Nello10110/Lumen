import type fr from '../fr/sessionsCard'
import type { Structure } from '../../types'

/** Allemand — espace « sessionsCard » (backlog § BL.2), traduit depuis le français. */
const sessionsCard: Structure<typeof fr> = {
  sessionsActives: "Aktive Sitzungen",
  unAppareilOuNavigateurConnecte: "Ein angemeldetes Gerät oder ein Browser pro Zeile. Das Widerrufen einer Sitzung meldet dieses Gerät sofort ab, ohne die anderen zu berühren.",
  ipInconnue: "Unbekannte IP",
  sessionActuelle: "(aktuelle Sitzung)",
  agentInconnu: "Unbekannter Agent",
  derniereActivite: "· letzte Aktivität",
  revoquer: "Widerrufen",
}

export default sessionsCard
