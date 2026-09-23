import type fr from '../fr/categoriesEtReglesSection'
import type { Structure } from '../../types'

/** Allemand — espace « categoriesEtReglesSection » (backlog § BL.2), traduit depuis le français. */
const categoriesEtReglesSection: Structure<typeof fr> = {
  categoriesEtReglesDeCategorisation: "Kategorien und Kategorisierungsregeln",
  categories: "Kategorien",
  texte: "×",
  nouvelleCategorie: "Neue Kategorie",
  ajouter: "Hinzufügen",
  reglesDeCategorisationAutomatique: "Regeln zur automatischen Kategorisierung",
  leLibelleContientLeMotif: "— „der Buchungstext enthält das Muster → Kategorie“",
  supprimer: "Löschen",
  motif: "Muster",
  motifExSncf: "Muster (z. B. sncf)",
  categorie: "Kategorie",
  categorie2: "— Kategorie —",
  ajouterLaRegle: "Regel hinzufügen",
  reapplicationEnCours: "Wird erneut angewendet...",
  reappliquerLesReglesEnMasse: "Regeln gesammelt erneut anwenden",
  mouvementsRecategorises: { one: "{n} Bewegung neu kategorisiert.", other: "{n} Bewegungen neu kategorisiert." },
}

export default categoriesEtReglesSection
