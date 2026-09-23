/** Textes français — espace « importLedgerSection » (backlog § BL.2). Généré par
 * `scripts/i18n-extraire.mjs`, puis relu à la main. */
const importLedgerSection = {
  walletCryptoExportLedger: "Wallet crypto (export Ledger)",
  pourUnExportDOperations: "Pour un export d'opérations Ledger (Bitcoin, Ethereum, Solana...). Chaque réception est traitée comme un achat au prix du jour de réception — utile si vous achetez directement sur le wallet, à ajuster manuellement si vous avez transféré des cryptos déjà achetées ailleurs. Les frais réseau ne sont pas comptés (pas de contrepartie en euros fiable dans le fichier).",
  fichierCsvExportLedgerLive: "Fichier CSV, export Ledger Live",
  walletCryptoLedger: "Wallet crypto Ledger",
  lectureDuFichier: "Lecture du fichier...",
  etablissement: "Établissement *",
  etablissement2: "Établissement",
  nomDuCompte: "Nom du compte",
  devisesAImporter: "Devises à importer ({n})",
  importEnCours: "Import en cours...",
  confirmerLImport: "Confirmer l'import",
  voirLeTableauDeBord: "Voir le tableau de bord",
} as const

export default importLedgerSection
