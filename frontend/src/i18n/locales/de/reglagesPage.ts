import type fr from '../fr/reglagesPage'
import type { Structure } from '../../types'

/** Allemand — espace « reglagesPage » (backlog § BL.2), traduit depuis le français. */
const reglagesPage: Structure<typeof fr> = {
  reglages: "Einstellungen",
  categoriesDeReglages: "Einstellungskategorien",
  assistantDeBienvenue: "Willkommensassistent",
  leParcoursGuideAfficheA: "Die geführte Tour, die beim Anlegen dieses Kontos angezeigt wird — nützlich, um die Anfangseinstellungen wiederzuentdecken oder die beim ersten Mal nicht ausgefüllten nachzuholen.",
  revoirLAssistantDeBienvenue: "Willkommensassistent erneut öffnen",
  langageSimple: "Einfache Sprache",
  remplaceLeJargonFinancierTwr: "Ersetzt Finanzjargon (TWR, Volatilität, Drawdown...) durch Alltagssprache; der Fachbegriff bleibt über einen Link „Fachbegriff“ jederzeit erreichbar.",
  active: "Aktiviert",
  desactive: "Deaktiviert",
  exporter: "Exportieren",
  fichiersCsvCompatiblesExcelSeparateur: "Excel-kompatible CSV-Dateien (Semikolon als Trennzeichen, Komma als Dezimalzeichen), direkt vom Browser heruntergeladen.",
  positions: "Positionen",
  transactions: "Transaktionen",
  rentabilite: "Rendite",
  releveDePatrimoinePdfUne: "Vermögensübersicht als PDF: eine formatierte Momentaufnahme zum Drucken oder Archivieren — Nettovermögen, Aufteilung und Gesamtrendite.",
  releveDePatrimoinePdf: "Vermögensübersicht (PDF)",
  declarationDePatrimoineIntro: "Vermögenserklärung: ein anpassbares Dokument für einen konkreten Dritten (Bank für einen Kredit, Notar für eine Schenkung) — Auswahl Vermögenswert für Vermögenswert, Filter nach Inhaber, optionales Kreditnehmerprofil.",
  declarationDePatrimoinePdf: "Vermögenserklärung (PDF)",
  bilanAnnuelEvolutionDuPatrimoine: "Jahresbilanz: Entwicklung des Nettovermögens und erreichte Meilensteine über ein Jahr, mit der aktuellen Lage für das laufende Jahr.",
  anneeDuBilan: "Jahr der Bilanz",
  bilanAnnuelPdf: "Jahresbilanz (PDF)",
  aucuneTachePlanifiee: "Keine geplante Aufgabe.",
  ongletGeneral: "Allgemein",
  ongletDetenteurs: "Inhaber",
  ongletSecurite: "Konten & Sicherheit",
  ongletPartage: "Teilen",
  ongletAutomatisations: "Automatisierungen",
  ongletBadges: "Abzeichen",
}

export default reglagesPage
