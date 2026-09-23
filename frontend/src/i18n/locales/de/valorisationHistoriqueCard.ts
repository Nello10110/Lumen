import type fr from '../fr/valorisationHistoriqueCard'
import type { Structure } from '../../types'

/** Allemand — espace « valorisationHistoriqueCard » (backlog § BL.2), traduit depuis le français. */
const valorisationHistoriqueCard: Structure<typeof fr> = {
  historiqueDeValorisation: "Bewertungshistorie",
  chaqueEstimationEstDateeEt: "Jede Schätzung wird datiert und aufbewahrt — die vorherige wird nie überschrieben.",
  lePremierPointCoutD: " Der erste Punkt (Anschaffungskosten) wird dem Diagramm hinzugefügt, nicht der Tabelle unten.",
  date: "Datum",
  valeurEstimee: "Geschätzter Wert",
  actions: "Aktionen",
  valeur: "Wert (€)",
  dontVersement: "Davon Einzahlung (€)",
  dontPlusValue: "Davon Gewinn (€)",
  enregistrer: "Speichern",
  annuler: "Abbrechen",
  dont: "davon",
  verses: "eingezahlt",
  modifier: "Bearbeiten",
  supprimer: "Löschen",
  supprimerCePointDHistorique: "Diesen Verlaufspunkt löschen?",
  lePointDu: "Der Punkt vom",
  seraDefinitivementSupprime: ") wird endgültig gelöscht.",
  suppression: "Wird gelöscht...",
  ariaValeur: "Wert vom {date} (Bearbeitung)",
  ariaDate: "Datum vom {date} (Bearbeitung)",
  ariaVersement: "Einzahlung vom {date} (Bearbeitung)",
  ariaPlusValue: "Gewinn vom {date} (Bearbeitung)",
}

export default valorisationHistoriqueCard
