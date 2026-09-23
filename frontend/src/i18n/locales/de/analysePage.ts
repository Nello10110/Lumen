import type fr from '../fr/analysePage'
import type { Structure } from '../../types'

/** Allemand — espace « analysePage » (backlog § BL.2), traduit depuis le français. */
const analysePage: Structure<typeof fr> = {
  analyse: "Analyse",
  actualisation: "Aktualisierung...",
  actualiser: "Aktualisieren",
  sectionsDeLAnalyse: "Abschnitte der Analyse",
  valeurDesPositions: "Wert der Positionen",
  scoreDeDiversification: "Diversifikationswert",
  repartitionGeographique: "Geografische Aufteilung",
  geographieDesFondsEtfIssue: "Geografie der Fonds/ETFs aus ihrer tatsächlichen Zusammensetzung (10 größte Positionen, auf 100 % des Fonds hochgerechnet), wenn Yahoo Finance sie liefert, sonst geschätzt aus dem abgebildeten Index (siehe Datenqualität unten); Sektoren der Fonds auf Basis ihrer vollständigen Zusammensetzung. Klicke auf einen Balken (oder eine Zeile der Vollbildtabelle), um die zugehörigen Zeilen zu sehen.",
  repartitionSectorielle: "Sektorale Aufteilung",
  ongletPortefeuille: "Portfolio",
  ongletRepartition: "Aufteilung",
  ongletDiagnostic: "Diagnose",
  ongletEvolution: "Entwicklung",
  ongletRevenus: "Erträge",
  ongletAchatLocation: "Kaufen vs. Mieten",
  ongletSimulateur: "Simulator",
}

export default analysePage
