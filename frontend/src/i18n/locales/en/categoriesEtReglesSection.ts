import type fr from '../fr/categoriesEtReglesSection'
import type { Structure } from '../../types'

/** Anglais — espace « categoriesEtReglesSection » (backlog § BL.2), traduit depuis le français. */
const categoriesEtReglesSection: Structure<typeof fr> = {
  categoriesEtReglesDeCategorisation: "Categories and categorization rules",
  categories: "Categories",
  texte: "×",
  nouvelleCategorie: "New category",
  ajouter: "Add",
  reglesDeCategorisationAutomatique: "Automatic categorization rules",
  leLibelleContientLeMotif: "— “the description contains the pattern → category”",
  supprimer: "Delete",
  motif: "Pattern",
  motifExSncf: "Pattern (e.g. sncf)",
  categorie: "Category",
  categorie2: "— Category —",
  ajouterLaRegle: "Add the rule",
  reapplicationEnCours: "Reapplying...",
  reappliquerLesReglesEnMasse: "Reapply the rules in bulk",
  mouvementsRecategorises: { one: "{n} transaction recategorized.", other: "{n} transactions recategorized." },
  exclueDesTotaux: "Excluded from totals",
  exclueDesTotauxAide: "Transactions in a category excluded from totals (transfers between your own accounts, for example) stay listed, but count neither as money in nor as money out, nor in any budget indicator. A subcategory follows its category.",
  exclueAvecSaCategorie: "Excluded with its category",
  supprimerLaCategorie: "Delete {nom}",
  exclureDesTotaux: "Exclude {nom} from totals",
}

export default categoriesEtReglesSection
