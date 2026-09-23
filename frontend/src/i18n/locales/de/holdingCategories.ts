import type fr from '../fr/holdingCategories'
import type { Structure } from '../../types'

/** Allemand — espace « holdingCategories » (backlog § BL.2), traduit depuis le français. */
const holdingCategories: Structure<typeof fr> = {
  decoteAnnuelle: "Jährlicher Wertverlust (%)",
  tauxDInteretAnnuel: "Jährlicher Zinssatz (%)",
  onglet: { tous: "Alle", actions: "Aktien", etf: "ETFs", obligations: "Anleihen", privateEquity: "Private Equity", crypto: "Krypto", immobilierEpargne: "Immobilien & Ersparnisse", autres: "Sonstige" },
  type: { nonPrecise: "Nicht angegeben", action: "Aktie", etfFonds: "ETF / Fonds", crypto: "Krypto", obligation: "Anleihe", privateEquity: "Private Equity", immobilier: "Immobilie", scpi: "SCPI (Immobilienfonds)", assuranceVie: "Lebensversicherung", per: "PER / Altersvorsorge", compteCourant: "Girokonto", epargneReglementee: "Reguliertes Sparen (Livret A, LDDS...)", epargneSalariale: "Mitarbeitersparen (PEE, PERCO...)", vehicule: "Fahrzeug", autreActif: "Sonstiger Vermögenswert" },
  aidePrixRevient: "Beim Kauf investierter Betrag. Für eine importierte Aktie/einen ETF automatisch aus Ihren Transaktionen berechnet; für eine manuell erfasste Zeile (Immobilie, Lebensversicherung...) selbst einzutragen. Er bleibt eine feste Basis zur Berechnung Ihres Gewinns oder Verlusts.",
  aideValeurEstimee: "Aktueller Wert des Vermögenswerts, von Ihnen selbst zu aktualisieren (Maklerschätzung, Wertgutachten...) — betrifft nur manuell bewertete Zeilen (Immobilien, SCPI, Lebensversicherung...). Er ersetzt dann die Berechnung Preis × Menge. Jede Änderung bleibt in der Historie erhalten, nie stillschweigend überschrieben.",
}

export default holdingCategories
