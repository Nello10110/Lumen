import type fr from '../fr/budgetPage'
import type { Structure } from '../../types'

/** Allemand — espace « budgetPage » (backlog § BL.2), traduit depuis le français. */
const budgetPage: Structure<typeof fr> = {
  nonDepense: "Nicht ausgegeben",
  budget: "Budget",
  periode: "Zeitraum",
  au: "bis",
  laDateDeFinDoit: "Das Enddatum muss gleich oder nach dem Startdatum liegen.",
  aucunMouvementBancaireImportePour: "Keine Kontobewegungen für diesen Zeitraum importiert.",
  importeUnReleveCsvOfx: "Importiere einen Auszug (CSV, OFX oder QIF) über den Bildschirm Import.",
  disponibleSurLaPeriode: "Verfügbar im Zeitraum",
  dEntrees: "Einnahmen −",
  deSorties: "Ausgaben",
  depensesRecurrentesMois: "Wiederkehrende Ausgaben / Monat",
  estimeSurLes3Derniers: "geschätzt über die letzten 3 Monate",
  tauxDEpargneReel: "Tatsächliche Sparquote",
  sortiesCategorieEpargneEntrees: "Ausgaben der Kategorie „Sparen“ / Einnahmen",
  resteAVivre: "Frei verfügbares Einkommen",
  entreesLogementChargesRecurrentes: "Einnahmen − Wohnen − wiederkehrende Kosten",
  tauxDEpargneIndisponibleCree: "Sparquote nicht verfügbar: Lege unten eine Kategorie „Sparen“ an oder benenne eine um. ",
  resteAVivreIndisponibleCree: "Frei verfügbares Einkommen nicht verfügbar: Lege unten eine Kategorie „Wohnen“ an oder benenne eine um.",
  modeMensuel: "Monatlich",
  modeAnnuel: "Jährlich",
  modePersonnalise: "Benutzerdefiniert",
}

export default budgetPage
