import type fr from '../fr/preferencesCard'
import type { Structure } from '../../types'

/** Allemand — espace « preferencesCard » (backlog § BL.2), traduit depuis le français. */
const preferencesCard: Structure<typeof fr> = {
  methodeDeCalculDuCout: "Methode zur Berechnung des Einstandspreises",
  attentionChangerDeMethodeRecalcule: "Achtung: Ein Methodenwechsel berechnet Einstandspreis und realisierte Gewinne des GESAMTEN Portfolios sofort neu.",
  declarationDePatrimoine: "Vermögenserklärung",
  tauxDImpositionSaisiIci: "Hier erfasster Steuersatz, unverändert in die Vermögenserklärung übernommen (Reiter Exportieren) — die App führt keine Steuerberechnung durch, der Wert ist der, den du angibst.",
  tauxDImposition: "Steuersatz",
  nonRenseigne: "nicht angegeben",
  comparaisonPatrimoniale: "Vermögensvergleich",
  sertUniquementAChoisirLa: "Dient nur zur Wahl der passenden Altersgruppe für den Vergleich mit dem französischen Medianvermögen (Bildschirm Analyse) — nie anderswo gespeichert oder verwendet.",
  anneeDeNaissance: "Geburtsjahr",
  nonRenseignee: "nicht angegeben",
  coutMoyenPondere: "Gewichteter Durchschnittspreis",
  fifo: "FIFO (first in, first out)",
  coutMoyenPondereDescription: "Jeder Verkauf entnimmt den Durchschnittspreis der GESAMTEN Position zum Verkaufszeitpunkt: Der Einstandspreis bleibt ein einziger Durchschnitt, unabhängig vom Alter der verkauften Titel. Standardmethode der App.",
  fifoDescription: "Jeder Verkauf verbraucht zuerst die ältesten gekauften Titel: Entnommen werden deren Kosten, kein Durchschnitt. Der verbleibende Einstandspreis spiegelt dann nur die jüngsten Tranchen wider.",
  positionsRecalculees: { one: "{n} Portfolioposition mit der neuen Methode neu berechnet.", other: "{n} Portfoliopositionen mit der neuen Methode neu berechnet." },
}

export default preferencesCard
