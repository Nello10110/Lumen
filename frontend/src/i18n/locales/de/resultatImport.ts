import type fr from '../fr/resultatImport'
import type { Structure } from '../../types'

/** Allemand — espace « resultatImport » (backlog § BL.2), traduit depuis le français. */
const resultatImport: Structure<typeof fr> = {
  operationsImportees: { one: "{n} Vorgang importiert", other: "{n} Vorgänge importiert" },
  transactionsImportees: { one: "{n} Transaktion importiert", other: "{n} Transaktionen importiert" },
  mouvementsImportes: { one: "{n} Bewegung importiert", other: "{n} Bewegungen importiert" },
  misesAJour: { one: "{n} aktualisiert", other: "{n} aktualisiert" },
  dejaPresentesInchangees: { one: "{n} bereits vorhanden und unverändert", other: "{n} bereits vorhanden und unverändert" },
  dejaPresents: { one: "{n} bereits vorhanden", other: "{n} bereits vorhanden" },
  lignesIllisiblesIgnorees: { one: "{n} unlesbare Zeile übersprungen", other: "{n} unlesbare Zeilen übersprungen" },
  lignesHorsInvestissementIgnorees: { one: "{n} Zeile außerhalb der Anlageverfolgung übersprungen", other: "{n} Zeilen außerhalb der Anlageverfolgung übersprungen" },
  lignesHorsAchatVenteIgnorees: { one: "{n} Zeile ohne Kauf/Verkauf übersprungen", other: "{n} Zeilen ohne Kauf/Verkauf übersprungen" },
  positionsRecalculees: { one: "{n} Position im Portfolio neu berechnet", other: "{n} Positionen im Portfolio neu berechnet" },
  comptesCrees: { one: "{n} Konto angelegt", other: "{n} Konten angelegt" },
  anomaliesDetectees: { one: "{n} Anomalie erkannt (Verkauf größer als der Bestand) — Position auf 0 begrenzt, siehe Serverprotokolle.", other: "{n} Anomalien erkannt (Verkauf größer als der Bestand) — Positionen auf 0 begrenzt, siehe Serverprotokolle." },
  lignesManuellesRemplacees: { one: "{n} manuell erfasste Zeile durch die aus dem Journal neu berechnete Position ersetzt (gleicher Ticker) — das Journal ist maßgeblich.", other: "{n} manuell erfasste Zeilen durch die aus dem Journal neu berechnete Position ersetzt (gleicher Ticker) — das Journal ist maßgeblich." },
  lignesLues: { one: "{n} Zeile gelesen", other: "{n} Zeilen gelesen" },
  nonConfirmeesIgnorees: { one: "{n} unbestätigte übersprungen", other: "{n} unbestätigte übersprungen" },
  operationsHorsAchatVenteIgnorees: { one: "{n} Vorgang ohne Kauf/Verkauf übersprungen", other: "{n} Vorgänge ohne Kauf/Verkauf übersprungen" },
  mouvementsHorsBourseExclus: { one: "{n} Bewegung außerhalb der Börsenverfolgung ausgeschlossen.", other: "{n} Bewegungen außerhalb der Börsenverfolgung ausgeschlossen." },
  categorisesAutomatiquement: { one: "{n} automatisch durch deine Regeln kategorisiert.", other: "{n} automatisch durch deine Regeln kategorisiert." },
  biensDetectes: { one: "{n} Immobilie erkannt, insgesamt {montant} investiert", other: "{n} Immobilien erkannt, insgesamt {montant} investiert" },
  lignesHorsInvestissementNonImportees: { one: "{n} Zeile außerhalb der Anlageverfolgung nicht importiert (Gutschrift, Quellensteuer, Bonus...)", other: "{n} Zeilen außerhalb der Anlageverfolgung nicht importiert (Gutschrift, Quellensteuer, Bonus...)" },
  lignesImportees: { one: "{n} Zeile importiert", other: "{n} Zeilen importiert" },
  ignorees: { one: "{n} übersprungen", other: "{n} übersprungen" },
  nOperations: { one: "{n} Vorgang", other: "{n} Vorgänge" },
  nLignes: { one: "{n} Zeile", other: "{n} Zeilen" },
}

export default resultatImport
