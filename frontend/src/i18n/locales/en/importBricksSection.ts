import type fr from '../fr/importBricksSection'
import type { Structure } from '../../types'

/** Anglais — espace « importBricksSection » (backlog § BL.2), traduit depuis le français. */
const importBricksSection: Structure<typeof fr> = {
  crowdfundingImmobilierExportBricksCo: "Real estate crowdfunding (Bricks.co export)",
  pourUnExportDeTransactions: "For a Bricks.co transaction export (brick purchases, repayments, income received). Each repayment reuses the brick price of the last known purchase for the same property. Income is imported as a gross amount (before withholding tax, not taken line by line) and appears in the dividend calendar.",
  fichierCsvOuExcelExport: "CSV or Excel file, Bricks.co export",
  crowdfundingImmobilierBricksCo: "Bricks.co real estate crowdfunding",
  lectureDuFichier: "Reading the file...",
  etablissement: "Institution *",
  etablissement2: "Institution",
  nomDuCompte: "Account name",
  importEnCours: "Importing...",
  confirmerLImport: "Confirm the import",
  voirLeTableauDeBord: "See the dashboard",
}

export default importBricksSection
