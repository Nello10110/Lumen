import type fr from '../fr/categoriesEtReglesSection'
import type { Structure } from '../../types'

/** Italien — espace « categoriesEtReglesSection » (backlog § BL.2), traduit depuis le français. */
const categoriesEtReglesSection: Structure<typeof fr> = {
  categoriesEtReglesDeCategorisation: "Categorie e regole di classificazione",
  categories: "Categorie",
  texte: "×",
  nouvelleCategorie: "Nuova categoria",
  ajouter: "Aggiungi",
  reglesDeCategorisationAutomatique: "Regole di classificazione automatica",
  leLibelleContientLeMotif: "— «la descrizione contiene lo schema → categoria»",
  supprimer: "Elimina",
  motif: "Schema",
  motifExSncf: "Schema (es. sncf)",
  categorie: "Categoria",
  categorie2: "— Categoria —",
  ajouterLaRegle: "Aggiungi la regola",
  reapplicationEnCours: "Riapplicazione in corso...",
  reappliquerLesReglesEnMasse: "Riapplica le regole in blocco",
  mouvementsRecategorises: { one: "{n} movimento riclassificato.", other: "{n} movimenti riclassificati." },
}

export default categoriesEtReglesSection
