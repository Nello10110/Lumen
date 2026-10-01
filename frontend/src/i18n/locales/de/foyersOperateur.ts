import type fr from '../fr/foyersOperateur'
import type { Structure } from '../../types'

/** Allemand — espace « foyersOperateur » (backlog § BK.2d), traduit depuis le français. */
const foyersOperateur: Structure<typeof fr> = {
  titre: "Haushalte",
  intro: "Die Haushalte der Installation. Das Sperren eines Haushalts unterbricht sofort den Zugriff seiner Konten, ohne seine Daten anzutasten; beim Reaktivieren ist er wieder da. Hier siehst du weder Vermögen noch Beträge.",
  aucunFoyer: "Keine Haushalte.",
  aucunFoyerAide: "Erstelle einen mit einem Link „Erstelle deinen Haushalt“ weiter unten.",
  sansNom: "Haushalt ohne Namen",
  statutActif: "Aktiv",
  statutSuspendu: "Gesperrt",
  proprietaire: "Eigentümer:",
  aucunProprietaire: "keiner",
  comptes: "Konten:",
  creeLe: "Erstellt am:",
  derniereActivite: "Letzte Aktivität:",
  jamais: "nie",
  reactiver: "Reaktivieren",
  suspendre: "Sperren",
  designerProprietaire: "Eigentümer ernennen",
  supprimer: "Löschen",
  supprimerTitre: "Haushalt {foyer} löschen?",
  supprimerExplication: "Vermögen, Einstellungen, Freigabe-Links, Einladungen und Mitgliedschaften dieses Haushalts werden endgültig gelöscht. Die Konten bleiben erhalten: Konten, die nur diesen Haushalt hatten, bleiben ohne Haushalt.",
  supprimerDefinitivement: "Haushalt endgültig löschen",
}

export default foyersOperateur
