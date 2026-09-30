import type fr from '../fr/transfertPropriete'
import type { Structure } from '../../types'

/** Allemand — espace « transfertPropriete » (backlog § BK.2c), traduit depuis le français. */
const transfertPropriete: Structure<typeof fr> = {
  titre: "Eigentümerschaft des Haushalts übertragen",
  explication: "Das gewählte Mitglied wird Eigentümer des Haushalts, und du wirst ein normales Mitglied: Du hast dann keinen Zugriff mehr auf die Einstellungen und die Mitgliederverwaltung. Die Daten bleiben im Haushalt, es wird nichts verschoben. Nur der neue Eigentümer kann dir die Eigentümerschaft zurückgeben.",
  membreLabel: "Neuer Eigentümer",
  choisir: "Mitglied auswählen…",
  confirmationLabel: "Gib zur Bestätigung seinen Benutzernamen ein: {nom}",
  annuler: "Abbrechen",
  confirmer: "Eigentümerschaft übertragen",
}

export default transfertPropriete
