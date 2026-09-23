import type fr from '../fr/tuileSourceImport'
import type { Structure } from '../../types'

/** Italien — espace « tuileSourceImport » (backlog § BL.2), traduit depuis le français. */
const tuileSourceImport: Structure<typeof fr> = {
  lectureDuFichier: "Lettura del file...",
  jamaisImporte: "Mai importato",
  exporterDepuis: "Esportare da {source}",
  fermer: "Chiudi",
  importerDepuis: "Importa da {source}",
  nLignes: { one: "{n} riga", other: "{n} righe" },
  commentExporterDepuis: "Come esportare da {source}?",
}

export default tuileSourceImport
