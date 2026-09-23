import type fr from '../fr/importBricksSection'
import type { Structure } from '../../types'

/** Italien — espace « importBricksSection » (backlog § BL.2), traduit depuis le français. */
const importBricksSection: Structure<typeof fr> = {
  crowdfundingImmobilierExportBricksCo: "Crowdfunding immobiliare (esportazione Bricks.co)",
  pourUnExportDeTransactions: "Per un’esportazione delle transazioni Bricks.co (acquisti di brick, rimborsi, redditi percepiti). Ogni rimborso riprende il prezzo del brick dell’ultimo acquisto noto per lo stesso immobile. I redditi sono importati al lordo (senza ritenuta alla fonte, non ripresa riga per riga) e compaiono nel calendario dei dividendi.",
  fichierCsvOuExcelExport: "File CSV o Excel, esportazione Bricks.co",
  crowdfundingImmobilierBricksCo: "Crowdfunding immobiliare Bricks.co",
  lectureDuFichier: "Lettura del file...",
  etablissement: "Istituto *",
  etablissement2: "Istituto",
  nomDuCompte: "Nome del conto",
  importEnCours: "Importazione in corso...",
  confirmerLImport: "Conferma l’importazione",
  voirLeTableauDeBord: "Vedi la dashboard",
}

export default importBricksSection
