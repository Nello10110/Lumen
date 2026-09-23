import type fr from '../fr/importBricksSection'
import type { Structure } from '../../types'

/** Espagnol — espace « importBricksSection » (backlog § BL.2), traduit depuis le français. */
const importBricksSection: Structure<typeof fr> = {
  crowdfundingImmobilierExportBricksCo: "Crowdfunding inmobiliario (exportación Bricks.co)",
  pourUnExportDeTransactions: "Para una exportación de transacciones de Bricks.co (compras de ladrillos, reembolsos, ingresos percibidos). Cada reembolso retoma el precio del ladrillo de la última compra conocida del mismo inmueble. Los ingresos se importan en importe bruto (sin retención en origen, no retomada línea a línea) y aparecen en el calendario de dividendos.",
  fichierCsvOuExcelExport: "Archivo CSV o Excel, exportación Bricks.co",
  crowdfundingImmobilierBricksCo: "Crowdfunding inmobiliario Bricks.co",
  lectureDuFichier: "Leyendo el archivo...",
  etablissement: "Entidad *",
  etablissement2: "Entidad",
  nomDuCompte: "Nombre de la cuenta",
  importEnCours: "Importando...",
  confirmerLImport: "Confirmar la importación",
  voirLeTableauDeBord: "Ver el panel",
}

export default importBricksSection
