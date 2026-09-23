import type fr from '../fr/client'
import type { Structure } from '../../types'

/** Allemand — espace « client » (backlog § BL.2), traduit depuis le français. */
const client: Structure<typeof fr> = {
  erreurReseau: "Der Server ist nicht erreichbar. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
  introuvable: "Die angeforderte Ressource wurde nicht gefunden.",
  tropVolumineux: "Die gesendete Datei ist zu groß.",
  tropDeRequetes: "Zu viele Anfragen in kurzer Zeit. Bitte warten Sie, bevor Sie es erneut versuchen.",
  erreurInterne: "Auf dem Server ist ein interner Fehler aufgetreten. Versuchen Sie es später erneut.",
  erreurInattendue: "Ein unerwarteter Fehler ist aufgetreten ({statut}).",
  portailExpire: "Die Sitzung mit dem Authentifizierungsportal ist abgelaufen. Lade die Seite neu, um dich wieder anzumelden.",
}

export default client
