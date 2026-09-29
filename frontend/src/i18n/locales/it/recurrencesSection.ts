import type fr from '../fr/recurrencesSection'
import type { Structure } from '../../types'

/** Italien — espace « recurrencesSection » (backlog § BL.2), traduit depuis le français. */
const recurrencesSection: Structure<typeof fr> = {
  chargesRecurrentesEtAbonnements: "Spese ricorrenti e abbonamenti",
  detecteAutomatiquement: "Rilevato automaticamente dallo storico importato: movimenti che si ripetono almeno due volte con la stessa descrizione (le date che la banca aggiunge ai pagamenti con carta sono ignorate), con cadenza mensile, trimestrale o annuale, e ancora in corso. Il costo annuo è stimato sull'importo attuale.",
  libelle: "Descrizione",
  categorie: "Categoria",
  periodicite: "Periodicità",
  occurrences: "Occorrenze",
  montant: "Importo",
  mensuelle: "Mensile",
  trimestrielle: "Trimestrale",
  annuelle: "Annuale",
  hausseDePrix: "Aumento di prezzo",
  evolutionDepuis: "{pct} da {montant}",
  coutAnnuelEstime: "Costo annuo stimato",
  achatsFrequents: "Acquisti frequenti",
  achatsFrequentsAide: "Esercenti o bonifici che si ripetono senza un ritmo regolare: non sono conteggiati tra le spese ricorrenti.",
  totalObserve: "Totale nel periodo osservato",
  totalAbonnements: "Abbonamenti e addebiti: {annuel}/anno · {mensuel}/mese",
}

export default recurrencesSection
