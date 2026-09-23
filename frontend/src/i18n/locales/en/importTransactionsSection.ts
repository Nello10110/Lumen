import type fr from '../fr/importTransactionsSection'
import type { Structure } from '../../types'

/** Anglais — espace « importTransactionsSection » (backlog § BL.2), traduit depuis le français. */
const importTransactionsSection: Structure<typeof fr> = {
  historiqueDeTransactionsFormatDetecte: "Transaction history (format detected automatically)",
  pourUnExportCompletDe: "For a full Trade Republic-style export (purchases, sales, dividends...). The actual portfolio is entirely rebuilt from this history (cost basis included). Only stock-market activity is kept: card payments and transfers with the bank (deposits/withdrawals) are excluded automatically. Each row is attached to the right account (PEA, securities account, crypto, bonds) under the institution you choose in the next step.",
  fichierCsvFormatTradeRepublic: "CSV file, Trade Republic format",
  historiqueDeTransactions: "Transaction history",
  lectureDuFichier: "Reading the file...",
  etablissement: "Institution *",
  etablissement2: "Institution",
  importEnCours: "Importing...",
  confirmerLImport: "Confirm the import",
  voirLeTableauDeBord: "See the dashboard",
}

export default importTransactionsSection
