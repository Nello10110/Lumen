import type fr from '../fr/importLedgerSection'
import type { Structure } from '../../types'

/** Allemand — espace « importLedgerSection » (backlog § BL.2), traduit depuis le français. */
const importLedgerSection: Structure<typeof fr> = {
  walletCryptoExportLedger: "Krypto-Wallet (Ledger-Export)",
  pourUnExportDOperations: "Für einen Ledger-Operationsexport (Bitcoin, Ethereum, Solana...). Jeder Eingang wird als Kauf zum Kurs des Eingangstags behandelt — nützlich, wenn Sie direkt auf dem Wallet kaufen; manuell anzupassen, wenn Sie anderswo gekaufte Kryptos übertragen haben. Netzwerkgebühren werden nicht berücksichtigt (kein verlässlicher Euro-Gegenwert in der Datei).",
  fichierCsvExportLedgerLive: "CSV-Datei, Ledger-Live-Export",
  walletCryptoLedger: "Ledger-Krypto-Wallet",
  lectureDuFichier: "Datei wird gelesen...",
  etablissement: "Institut *",
  etablissement2: "Institut",
  nomDuCompte: "Kontoname",
  devisesAImporter: "Zu importierende Währungen ({n})",
  importEnCours: "Import läuft...",
  confirmerLImport: "Import bestätigen",
  voirLeTableauDeBord: "Zum Dashboard",
}

export default importLedgerSection
