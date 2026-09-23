import type fr from '../fr/importLedgerSection'
import type { Structure } from '../../types'

/** Anglais — espace « importLedgerSection » (backlog § BL.2), traduit depuis le français. */
const importLedgerSection: Structure<typeof fr> = {
  walletCryptoExportLedger: "Crypto wallet (Ledger export)",
  pourUnExportDOperations: "For a Ledger operations export (Bitcoin, Ethereum, Solana...). Each receipt is treated as a purchase at the price on the day of receipt — useful if you buy directly on the wallet, to adjust manually if you transferred crypto bought elsewhere. Network fees are not counted (no reliable euro counter-value in the file).",
  fichierCsvExportLedgerLive: "CSV file, Ledger Live export",
  walletCryptoLedger: "Ledger crypto wallet",
  lectureDuFichier: "Reading the file...",
  etablissement: "Institution *",
  etablissement2: "Institution",
  nomDuCompte: "Account name",
  devisesAImporter: "Currencies to import ({n})",
  importEnCours: "Importing...",
  confirmerLImport: "Confirm the import",
  voirLeTableauDeBord: "See the dashboard",
}

export default importLedgerSection
