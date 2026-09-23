import type fr from '../fr/importLedgerSection'
import type { Structure } from '../../types'

/** Italien — espace « importLedgerSection » (backlog § BL.2), traduit depuis le français. */
const importLedgerSection: Structure<typeof fr> = {
  walletCryptoExportLedger: "Wallet cripto (esportazione Ledger)",
  pourUnExportDOperations: "Per un’esportazione delle operazioni Ledger (Bitcoin, Ethereum, Solana...). Ogni ricezione è trattata come un acquisto al prezzo del giorno di ricezione: utile se acquista direttamente sul wallet, da correggere a mano se ha trasferito cripto già acquistate altrove. Le commissioni di rete non sono conteggiate (nessun controvalore affidabile in euro nel file).",
  fichierCsvExportLedgerLive: "File CSV, esportazione Ledger Live",
  walletCryptoLedger: "Wallet cripto Ledger",
  lectureDuFichier: "Lettura del file...",
  etablissement: "Istituto *",
  etablissement2: "Istituto",
  nomDuCompte: "Nome del conto",
  devisesAImporter: "Valute da importare ({n})",
  importEnCours: "Importazione in corso...",
  confirmerLImport: "Conferma l’importazione",
  voirLeTableauDeBord: "Vedi la dashboard",
}

export default importLedgerSection
