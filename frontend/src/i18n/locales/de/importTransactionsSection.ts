import type fr from '../fr/importTransactionsSection'
import type { Structure } from '../../types'

/** Allemand — espace « importTransactionsSection » (backlog § BL.2), traduit depuis le français. */
const importTransactionsSection: Structure<typeof fr> = {
  historiqueDeTransactionsFormatDetecte: "Transaktionshistorie (Format automatisch erkannt)",
  pourUnExportCompletDe: "Für einen vollständigen Export im Stil von Trade Republic (Käufe, Verkäufe, Dividenden...). Das tatsächliche Portfolio wird vollständig aus dieser Historie neu berechnet (Einstandskosten inklusive). Nur die Börsenaktivität wird übernommen: Kartenzahlungen und Überweisungen mit der Bank (Ein-/Auszahlungen) werden automatisch ausgeschlossen. Jede Zeile wird dem passenden Konto zugeordnet (PEA, Wertpapierdepot, Krypto, Anleihen) unter dem Institut, das Sie im nächsten Schritt wählen.",
  fichierCsvFormatTradeRepublic: "CSV-Datei, Trade-Republic-Format",
  historiqueDeTransactions: "Transaktionshistorie",
  lectureDuFichier: "Datei wird gelesen...",
  etablissement: "Institut *",
  etablissement2: "Institut",
  importEnCours: "Import läuft...",
  confirmerLImport: "Import bestätigen",
  voirLeTableauDeBord: "Zum Dashboard",
}

export default importTransactionsSection
