import type fr from '../fr/sectionLiensFoyer'
import type { Structure } from '../../types'

/** Allemand — espace « sectionLiensFoyer » (backlog § BK.2d), traduit depuis le français. */
const sectionLiensFoyer: Structure<typeof fr> = {
  duree: "Gültigkeit des Links",
  libelle: "Für wen? (optional)",
  libellePlaceholder: "z. B. Familie Martin",
  creer: "Link erstellen",
  lienPret: "Der Link „Erstelle deinen Haushalt“ ist bereit.",
  lienUneSeuleFois: "Kopiere ihn jetzt: Er wird danach nicht mehr angezeigt. Schicke ihn der Person selbst (Nachricht, E-Mail …). Er gilt nur einmal.",
  lienAria: "Link zum Erstellen eines Haushalts",
  titreListe: "Links zur Haushaltserstellung",
  aucunLien: "Noch keine Links.",
  sansLibelle: "Ohne Bezeichnung",
}

export default sectionLiensFoyer
