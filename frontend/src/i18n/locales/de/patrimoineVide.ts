import type fr from '../fr/patrimoineVide'
import type { Structure } from '../../types'

/** Allemand — espace « patrimoineVide » (backlog § BL.2), traduit depuis le français. */
const patrimoineVide: Structure<typeof fr> = {
  rienNEstEncoreAttribue: "Dieser Person ist noch nichts zugeordnet",
  unActifAppartientAuFoyer: "Ein Vermögenswert gehört dem Haushalt, solange er nicht aufgeteilt ist. Gib den Anteil jeder Person über ein Konto an: ihr Vermögen erscheint dann hier.",
  repartirUnCompte: "Ein Konto aufteilen",
  voirToutLeFoyer: "Ganzen Haushalt anzeigen",
  tonPatrimoineCommenceIci: "Dein Vermögen beginnt hier",
  ajouteTesComptesPlacementsBiens: "Füge deine Konten, Anlagen, Immobilien und Kredite hinzu: Lumen berechnet dein Nettovermögen und verfolgt seine Entwicklung.",
  aucunActifNeTEst: "Für dich ist noch kein Vermögenswert sichtbar. Er erscheint hier, sobald ein Haushaltsmitglied ihn hinzugefügt hat.",
  importerUnReleve: "Einen Auszug importieren",
  saisirUneLigneALa: "Eine Zeile von Hand erfassen",
  rienAttribueA: "{nom} ist noch nichts zugeordnet",
}

export default patrimoineVide
