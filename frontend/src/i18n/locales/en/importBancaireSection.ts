import type fr from '../fr/importBancaireSection'
import type { Structure } from '../../types'

/** Anglais — espace « importBancaireSection » (backlog § BL.2), traduit depuis le français. */
const importBancaireSection: Structure<typeof fr> = {
  lectureDuFichier: "Reading the file...",
  colonneDate: "Date column *",
  choisir: "— Choose —",
  colonneLibelle: "Description column *",
  compteOptionnelAnnotationLibre: "Account (optional, free annotation)",
  compteCourant: "Current account",
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
}

export default importBancaireSection
