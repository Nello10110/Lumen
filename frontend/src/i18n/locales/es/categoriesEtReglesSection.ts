import type fr from '../fr/categoriesEtReglesSection'
import type { Structure } from '../../types'

/** Espagnol — espace « categoriesEtReglesSection » (backlog § BL.2), traduit depuis le français. */
const categoriesEtReglesSection: Structure<typeof fr> = {
  categoriesEtReglesDeCategorisation: "Categorías y reglas de categorización",
  categories: "Categorías",
  texte: "×",
  nouvelleCategorie: "Nueva categoría",
  ajouter: "Añadir",
  reglesDeCategorisationAutomatique: "Reglas de categorización automática",
  leLibelleContientLeMotif: "— «el concepto contiene el patrón → categoría»",
  supprimer: "Eliminar",
  motif: "Patrón",
  motifExSncf: "Patrón (p. ej. sncf)",
  categorie: "Categoría",
  categorie2: "— Categoría —",
  ajouterLaRegle: "Añadir la regla",
  reapplicationEnCours: "Reaplicando...",
  reappliquerLesReglesEnMasse: "Reaplicar las reglas en bloque",
  mouvementsRecategorises: { one: "{n} movimiento recategorizado.", other: "{n} movimientos recategorizados." },
}

export default categoriesEtReglesSection
