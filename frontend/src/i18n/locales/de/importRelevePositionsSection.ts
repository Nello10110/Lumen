import type fr from '../fr/importRelevePositionsSection'
import type { Structure } from '../../types'

/** Allemand — espace « importRelevePositionsSection » (backlog § BL.2), traduit depuis le français. */
const importRelevePositionsSection: Structure<typeof fr> = {
  lectureDuFichier: "Datei wird gelesen...",
  voirLePatrimoine: "Zu den Vermögenswerten",
  apercu: { one: "Vorschau ({n} Zeile insgesamt)", other: "Vorschau ({n} Zeilen insgesamt)" },
  colonneTicker: "Spalte Ticker *",
  choisir: "— Auswählen —",
  colonneQuantite: "Spalte Menge *",
  colonnePrixDeRevientOptionnel: "Spalte Einstandspreis (optional)",
  aucune: "— Keine —",
  etablissementDesComptesCrees: "Institut der angelegten Konten *",
  etablissementDesComptesCrees2: "Institut der angelegten Konten",
  remplacerLesLignesDejaSaisies: "Bereits manuell erfasste oder importierte Zeilen ersetzen (Positionen aus dem Transaktionsjournal bleiben unverändert)",
  importEnCours: "Import läuft...",
  confirmerLImport: "Import bestätigen",
  nomOptionnel: "Name (optional)",
  compteOptionnel: "Konto (optional)",
  deviseOptionnel: "Währung (optional)",
}

export default importRelevePositionsSection
