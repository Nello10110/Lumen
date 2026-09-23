import type fr from '../fr/tuileSourceImport'
import type { Structure } from '../../types'

/** Anglais — espace « tuileSourceImport » (backlog § BL.2), traduit depuis le français. */
const tuileSourceImport: Structure<typeof fr> = {
  lectureDuFichier: "Reading the file...",
  jamaisImporte: "Never imported",
  exporterDepuis: "Export from {source}",
  fermer: "Close",
  importerDepuis: "Import from {source}",
  nLignes: { one: "{n} row", other: "{n} rows" },
  commentExporterDepuis: "How do I export from {source}?",
}

export default tuileSourceImport
