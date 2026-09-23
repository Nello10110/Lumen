import type fr from '../fr/plusValueParCompteCard'
import type { Structure } from '../../types'

/** Allemand — espace « plusValueParCompteCard » (backlog § BL.2), traduit depuis le français. */
const plusValueParCompteCard: Structure<typeof fr> = {
  plusValueParCompte: "Gewinn nach Konto",
  rienAComparerPourL: "Noch nichts zu vergleichen.",
  ceComparatifPorteSurLes: "Dieser Vergleich umfasst Zeilen mit bekanntem Einstandspreis (Aktien, Fonds, Immobilien...) — ein Giro- oder Sparkonto hat keinen.",
  plusValueLatenteValeurActuelle: "Nicht realisierter Gewinn (aktueller Wert minus Einstandspreis) je Konto — zeigt auf einen Blick, welche Konten das Vermögen nach oben oder unten ziehen.",
  plusValue: "Gewinn",
  moinsValue: "Verlust",
  compte: "Konto",
  valeur: "Wert",
  moyenneDesRendementsAnnualisesXirr: "Durchschnitt der annualisierten Renditen (XIRR) jeder Zeile des Kontos, gewichtet nach ihrem aktuellen Wert — unverbindlich, keine Berechnung Fluss für Fluss auf Kontoebene.",
  rendementAnnualise: "Annualisierte Rendite",
  pasDeValorisationConnuePour: "Keine bekannte Bewertung für dieses Konto (Positionen zum Einstandspreis bewertet, mangels Kurs).",
}

export default plusValueParCompteCard
