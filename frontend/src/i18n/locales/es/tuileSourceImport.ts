import type fr from '../fr/tuileSourceImport'
import type { Structure } from '../../types'

/** Espagnol — espace « tuileSourceImport » (backlog § BL.2), traduit depuis le français. */
const tuileSourceImport: Structure<typeof fr> = {
  lectureDuFichier: "Leyendo el archivo...",
  jamaisImporte: "Nunca importado",
  exporterDepuis: "Exportar desde {source}",
  fermer: "Cerrar",
  importerDepuis: "Importar desde {source}",
  nLignes: { one: "{n} línea", other: "{n} líneas" },
  commentExporterDepuis: "¿Cómo exportar desde {source}?",
}

export default tuileSourceImport
