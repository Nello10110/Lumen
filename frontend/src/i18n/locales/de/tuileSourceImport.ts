import type fr from '../fr/tuileSourceImport'
import type { Structure } from '../../types'

/** Allemand — espace « tuileSourceImport » (backlog § BL.2), traduit depuis le français. */
const tuileSourceImport: Structure<typeof fr> = {
  lectureDuFichier: "Datei wird gelesen...",
  jamaisImporte: "Nie importiert",
  exporterDepuis: "Aus {source} exportieren",
  fermer: "Schließen",
  importerDepuis: "Aus {source} importieren",
  nLignes: { one: "{n} Zeile", other: "{n} Zeilen" },
  commentExporterDepuis: "Wie exportiere ich aus {source}?",
}

export default tuileSourceImport
