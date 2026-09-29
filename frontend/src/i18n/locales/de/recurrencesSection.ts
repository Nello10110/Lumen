import type fr from '../fr/recurrencesSection'
import type { Structure } from '../../types'

/** Allemand — espace « recurrencesSection » (backlog § BL.2), traduit depuis le français. */
const recurrencesSection: Structure<typeof fr> = {
  chargesRecurrentesEtAbonnements: "Wiederkehrende Kosten und Abonnements",
  detecteAutomatiquement: "Automatisch aus dem importierten Verlauf erkannt — Bewegungen, die mindestens zweimal mit demselben Buchungstext auftreten (Daten, die die Bank an Kartenzahlungen anhängt, werden ignoriert), im monatlichen, vierteljährlichen oder jährlichen Rhythmus und noch laufend. Die jährlichen Kosten werden aus dem aktuellen Betrag geschätzt.",
  libelle: "Buchungstext",
  categorie: "Kategorie",
  periodicite: "Häufigkeit",
  occurrences: "Vorkommen",
  montant: "Betrag",
  mensuelle: "Monatlich",
  trimestrielle: "Vierteljährlich",
  annuelle: "Jährlich",
  hausseDePrix: "Preiserhöhung",
  evolutionDepuis: "{pct} seit {montant}",
  coutAnnuelEstime: "Geschätzte Jahreskosten",
  achatsFrequents: "Häufige Käufe",
  achatsFrequentsAide: "Händler oder Überweisungen, die ohne festen Rhythmus wiederkehren: Sie zählen nicht zu den wiederkehrenden Kosten.",
  totalObserve: "Summe im beobachteten Zeitraum",
  totalAbonnements: "Abos und Lastschriften: {annuel}/Jahr · {mensuel}/Monat",
}

export default recurrencesSection
