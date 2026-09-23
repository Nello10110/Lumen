import type fr from '../fr/importLedgerSection'
import type { Structure } from '../../types'

/** Espagnol — espace « importLedgerSection » (backlog § BL.2), traduit depuis le français. */
const importLedgerSection: Structure<typeof fr> = {
  walletCryptoExportLedger: "Wallet cripto (exportación Ledger)",
  pourUnExportDOperations: "Para una exportación de operaciones de Ledger (Bitcoin, Ethereum, Solana...). Cada recepción se trata como una compra al precio del día de recepción: útil si compra directamente en el wallet, a ajustar manualmente si transfirió criptos ya compradas en otro sitio. Las comisiones de red no se cuentan (no hay contravalor fiable en euros en el archivo).",
  fichierCsvExportLedgerLive: "Archivo CSV, exportación Ledger Live",
  walletCryptoLedger: "Wallet cripto Ledger",
  lectureDuFichier: "Leyendo el archivo...",
  etablissement: "Entidad *",
  etablissement2: "Entidad",
  nomDuCompte: "Nombre de la cuenta",
  devisesAImporter: "Divisas a importar ({n})",
  importEnCours: "Importando...",
  confirmerLImport: "Confirmar la importación",
  voirLeTableauDeBord: "Ver el panel",
}

export default importLedgerSection
