import type fr from '../fr/supprimerCompte'
import type { Structure } from '../../types'

/** Allemand — espace « supprimerCompte » (backlog § BK.2c), traduit depuis le français. */
const supprimerCompte: Structure<typeof fr> = {
  menu: "Mein Konto löschen",
  titre: "Mein Konto löschen?",
  explication: "Ihr Konto, seine Anmeldesitzungen und sein Zugriffsprotokoll werden endgültig gelöscht.",
  foyersSupprimes: { one: "Dieser Haushalt wird mit Ihrem Konto samt allen Daten gelöscht: Sie sind sein einziges Mitglied.", other: "Diese {n} Haushalte werden mit Ihrem Konto samt allen Daten gelöscht: Sie sind ihr einziges Mitglied." },
  foyersQuittes: { one: "Sie verlassen diesen Haushalt, dessen Daten bei seinen anderen Mitgliedern bleiben:", other: "Sie verlassen diese {n} Haushalte, deren Daten bei ihren anderen Mitgliedern bleiben:" },
  irreversible: "Diese Aktion ist unwiderruflich.",
  confirmationLabel: "Geben Sie zur Bestätigung Ihren Benutzernamen ein: {nom}",
  annuler: "Abbrechen",
  fermer: "Schließen",
  supprimer: "Endgültig löschen",
  bloqueIntro: { one: "Sie können Ihr Konto derzeit nicht löschen: Sie sind Eigentümer eines Haushalts, der weitere Konten hat.", other: "Sie können Ihr Konto derzeit nicht löschen: Sie sind Eigentümer von {n} Haushalten, die weitere Konten haben." },
  autresComptes: { one: "{n} weiteres Konto", other: "{n} weitere Konten" },
  bloqueSolution: "Öffnen Sie dazu diesen Haushalt (Haushaltsauswahl) und übertragen Sie seine Eigentümerschaft unter Einstellungen → Konten & Sicherheit, oder löschen Sie ihn unter Einstellungen → Allgemein.",
}

export default supprimerCompte
