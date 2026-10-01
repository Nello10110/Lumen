import type fr from '../fr/comptesSansFoyer'
import type { Structure } from '../../types'

/** Allemand — espace « comptesSansFoyer » (backlog § BK.2d), traduit depuis le français. */
const comptesSansFoyer: Structure<typeof fr> = {
  titre: "Konten ohne Haushalt",
  intro: "Konten, die sich anmelden können, aber zu keinem Haushalt gehören – das Löschen oder Verlassen ihres letzten Haushalts lässt sie hier zurück. Ein Konto löscht sich selbst; solange es keinen Haushalt mehr hat, kannst du es an seiner Stelle tun.",
  aucun: "Keine Konten ohne Haushalt.",
  creeLe: "Erstellt am {date}",
  derniereConnexion: "letzte Anmeldung {date}",
  jamaisConnecte: "nie angemeldet",
  supprimer: "Löschen",
  supprimerAria: "Konto {nom} löschen",
  supprimerTitre: "Konto {nom} löschen?",
  supprimerExplication: "Das Konto, seine Sitzungen und sein Zugriffsprotokoll werden endgültig gelöscht.",
  supprimerDefinitivement: "Konto endgültig löschen",
}

export default comptesSansFoyer
