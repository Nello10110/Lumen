import type fr from '../fr/importBancaireSection'
import type { Structure } from '../../types'

/** Anglais — espace « importBancaireSection » (backlog § BL.2), traduit depuis le français. */
const importBancaireSection: Structure<typeof fr> = {
  lectureDuFichier: "Reading the file...",
  colonneDate: "Date column *",
  choisir: "— Choose —",
  colonneLibelle: "Description column *",
  choisisLeCompteDuReleve: "Choose the bank account for this statement, then confirm the import.",
  leFichierExprimeLesMontants: "The file expresses amounts as:",
  uneSeuleColonneSignee: "A single signed column (+/-)",
  deuxColonnesDebitCreditSeparees: "Two separate debit/credit columns",
  colonneMontant: "Amount column *",
  colonneDebit: "Debit column",
  aucune: "— None —",
  colonneCredit: "Credit column",
  importEnCours: "Importing...",
  confirmerLImport: "Confirm the import",
  voirLeBudget: "See the budget",
  formatReconnu: "Recognized format: {banque}",
  mappingPreRempli: "Columns pre-filled from this format; you can change them.",
  colonneCategorie: "Category column",
  colonneSousCategorie: "Subcategory column",
  categoriesDeLaBanque: "Optional: the bank's categories are added to your categories as they are. Your categorization rules still take priority.",
}

export default importBancaireSection
