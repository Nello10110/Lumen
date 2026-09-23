import type fr from '../fr/journalAccesCard'
import type { Structure } from '../../types'

/** Allemand — espace « journalAccesCard » (backlog § BL.2), traduit depuis le français. */
const journalAccesCard: Structure<typeof fr> = {
  journalDAcces: "Zugriffsprotokoll",
  historiqueDesConnexionsEtDeconnexions: "Verlauf der An- und Abmeldungen, erfolgreich oder nicht.",
  retournerEnPage1: "Zurück zu Seite 1",
  deconnexion: "Abmeldung",
  ipInconnue: "Unbekannte IP",
  succes: "Erfolg",
  pagePrecedente: "Vorherige Seite",
  page: "Seite",
  pageSuivante: "Nächste Seite",
  aucuneEntree: "Kein Eintrag.",
  aucuneEntreeSurCettePage: "Kein Eintrag auf dieser Seite.",
  connexion: "Anmeldung",
  echec: "Fehlgeschlagen ({raison})",
  raisonCompteVerrouille: "Konto gesperrt",
  raisonCompteInconnu: "unbekanntes Konto",
  raisonCompteSsoSeul: "Nur-SSO-Konto",
  raisonMotDePasseIncorrect: "falsches Passwort",
  raisonOidcEchec: "SSO-Fehler",
}

export default journalAccesCard
