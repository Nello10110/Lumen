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
  exclueDesTotaux: "Excluida de los totales",
  exclueDesTotauxAide: "Los movimientos de una categoría excluida de los totales (transferencias entre tus propias cuentas, por ejemplo) siguen apareciendo en la lista, pero no cuentan ni en las entradas, ni en las salidas, ni en ningún indicador del presupuesto. Una subcategoría sigue a su categoría.",
  exclueAvecSaCategorie: "Excluida con su categoría",
  supprimerLaCategorie: "Eliminar {nom}",
  exclureDesTotaux: "Excluir {nom} de los totales",
}

export default categoriesEtReglesSection
