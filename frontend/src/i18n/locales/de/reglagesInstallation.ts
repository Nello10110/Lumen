import type fr from '../fr/reglagesInstallation'
import type { Structure } from '../../types'

/** Allemand — espace « reglagesInstallation » (backlog § BK.2d), traduit depuis le français. */
const reglagesInstallation: Structure<typeof fr> = {
  titre: "Entstehung von Haushalten",
  modeTitre: "Wie entsteht ein Haushalt?",
  modeIntro: "Der gewählte Modus gilt für die gesamte Installation.",
  modeFerme: "Geschlossen",
  modeFermeAide: "Nur der Betreiber erstellt einen Haushalt, indem er einen Link „Erstelle deinen Haushalt“ erzeugt.",
  modeInvitation: "Auf Einladung",
  modeInvitationAide: "Ein Eigentümer kann ebenfalls einen Link „Erstelle deinen Haushalt“ für eine nahestehende Person erzeugen. Beim Zurückschalten auf „Geschlossen“ erlöschen die Links der Eigentümer, nicht die des Betreibers.",
  ssoCreeSonFoyer: "Ein neues SSO-Konto erstellt seinen Haushalt",
  ssoCreeSonFoyerAide: "Ist die Option aus, wird ein neues SSO-Konto ohne Haushalt angelegt und wartet auf eine Einladung.",
  compteSansFoyerCree: "Ein Konto ohne Haushalt kann seinen eigenen erstellen",
  compteSansFoyerCreeAide: "Ist die Option aus, muss ein Konto ohne Haushalt eine Einladung annehmen (oder gelöscht werden).",
}

export default reglagesInstallation
