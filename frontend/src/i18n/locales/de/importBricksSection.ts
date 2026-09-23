import type fr from '../fr/importBricksSection'
import type { Structure } from '../../types'

/** Allemand — espace « importBricksSection » (backlog § BL.2), traduit depuis le français. */
const importBricksSection: Structure<typeof fr> = {
  crowdfundingImmobilierExportBricksCo: "Immobilien-Crowdfunding (Bricks.co-Export)",
  pourUnExportDeTransactions: "Für einen Bricks.co-Transaktionsexport (Brick-Käufe, Rückzahlungen, erhaltene Erträge). Jede Rückzahlung übernimmt den Brick-Preis des letzten bekannten Kaufs derselben Immobilie. Erträge werden brutto importiert (vor Quellensteuer, nicht zeilenweise übernommen) und erscheinen im Dividendenkalender.",
  fichierCsvOuExcelExport: "CSV- oder Excel-Datei, Bricks.co-Export",
  crowdfundingImmobilierBricksCo: "Immobilien-Crowdfunding Bricks.co",
  lectureDuFichier: "Datei wird gelesen...",
  etablissement: "Institut *",
  etablissement2: "Institut",
  nomDuCompte: "Kontoname",
  importEnCours: "Import läuft...",
  confirmerLImport: "Import bestätigen",
  voirLeTableauDeBord: "Zum Dashboard",
}

export default importBricksSection
