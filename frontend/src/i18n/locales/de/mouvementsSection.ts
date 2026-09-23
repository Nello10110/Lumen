import type fr from '../fr/mouvementsSection'
import type { Structure } from '../../types'

/** Allemand — espace « mouvementsSection » (backlog § BL.2), traduit depuis le français. */
const mouvementsSection: Structure<typeof fr> = {
  toutesCategories: "Alle Kategorien",
  nonCategorise: "Nicht kategorisiert",
  tousLesComptes: "Alle Konten",
  mouvements: "Bewegungen",
  aucunMouvementSurCettePeriode: "Keine Bewegungen in diesem Zeitraum.",
  importeUnReleveBancaireDepuis: "Importiere einen Kontoauszug über den Bildschirm Import.",
  aucunMouvementNeCorrespondA: "Keine Bewegung entspricht diesem Filter.",
  date: "Datum",
  libelle: "Buchungstext",
  montant: "Betrag",
  categorie: "Kategorie",
}

export default mouvementsSection
