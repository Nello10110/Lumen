import type fr from '../fr/importTransactionsSection'
import type { Structure } from '../../types'

/** Italien — espace « importTransactionsSection » (backlog § BL.2), traduit depuis le français. */
const importTransactionsSection: Structure<typeof fr> = {
  historiqueDeTransactionsFormatDetecte: "Storico delle transazioni (formato rilevato automaticamente)",
  pourUnExportCompletDe: "Per un’esportazione completa tipo Trade Republic (acquisti, vendite, dividendi...). Il portafoglio reale è interamente ricostruito da questo storico (prezzo di carico incluso). Si conserva solo l’attività di borsa: i pagamenti con carta e i bonifici con la banca (depositi/prelievi) sono esclusi automaticamente. Ogni riga è collegata al conto adatto (PEA, conto titoli, cripto, obbligazioni) sotto l’istituto che sceglierà al passo successivo.",
  fichierCsvFormatTradeRepublic: "File CSV, formato Trade Republic",
  historiqueDeTransactions: "Storico delle transazioni",
  lectureDuFichier: "Lettura del file...",
  etablissement: "Istituto *",
  etablissement2: "Istituto",
  importEnCours: "Importazione in corso...",
  confirmerLImport: "Conferma l’importazione",
  voirLeTableauDeBord: "Vedi la dashboard",
}

export default importTransactionsSection
