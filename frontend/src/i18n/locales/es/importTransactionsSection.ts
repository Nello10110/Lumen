import type fr from '../fr/importTransactionsSection'
import type { Structure } from '../../types'

/** Espagnol — espace « importTransactionsSection » (backlog § BL.2), traduit depuis le français. */
const importTransactionsSection: Structure<typeof fr> = {
  historiqueDeTransactionsFormatDetecte: "Historial de transacciones (formato detectado automáticamente)",
  pourUnExportCompletDe: "Para una exportación completa tipo Trade Republic (compras, ventas, dividendos...). La cartera real se reconstruye por completo a partir de este historial (precio de coste incluido). Solo se conserva la actividad bursátil: los pagos con tarjeta y las transferencias con el banco (depósitos/retiradas) se excluyen automáticamente. Cada línea se asocia a la cuenta adecuada (PEA, cuenta de valores, cripto, bonos) bajo la entidad que elija en el siguiente paso.",
  fichierCsvFormatTradeRepublic: "Archivo CSV, formato Trade Republic",
  historiqueDeTransactions: "Historial de transacciones",
  lectureDuFichier: "Leyendo el archivo...",
  etablissement: "Entidad *",
  etablissement2: "Entidad",
  importEnCours: "Importando...",
  confirmerLImport: "Confirmar la importación",
  voirLeTableauDeBord: "Ver el panel",
}

export default importTransactionsSection
