import type fr from '../fr/holdingCategories'
import type { Structure } from '../../types'

/** Italien — espace « holdingCategories » (backlog § BL.2), traduit depuis le français. */
const holdingCategories: Structure<typeof fr> = {
  decoteAnnuelle: "Deprezzamento annuo (%)",
  tauxDInteretAnnuel: "Tasso d'interesse annuo (%)",
  onglet: { tous: "Tutti", actions: "Azioni", etf: "ETF", obligations: "Obbligazioni", privateEquity: "Private equity", crypto: "Cripto", immobilierEpargne: "Immobili e risparmio", autres: "Altro" },
  type: { nonPrecise: "Non specificato", action: "Azione", etfFonds: "ETF / Fondo", crypto: "Cripto", obligation: "Obbligazione", privateEquity: "Private equity", immobilier: "Immobile", scpi: "SCPI (fondo immobiliare)", assuranceVie: "Assicurazione vita", per: "PER / Risparmio previdenziale", compteCourant: "Conto corrente", epargneReglementee: "Risparmio regolamentato (Livret A, LDDS...)", epargneSalariale: "Risparmio aziendale (PEE, PERCO...)", vehicule: "Veicolo", autreActif: "Altra attività" },
  aidePrixRevient: "Importo investito all'acquisto. Per un'azione/ETF importato, calcolato automaticamente dalle Sue operazioni; per una riga inserita a mano (immobile, assicurazione vita...), da indicare Lei stesso. Resta una base fissa, usata per calcolare il Suo guadagno o perdita.",
  aideValeurEstimee: "Valore attuale del bene, da aggiornare Lei stesso (stima di agenzia, perizia...): riguarda solo le righe valutate manualmente (immobili, SCPI, assicurazione vita...). Sostituisce allora il calcolo prezzo × quantità. Ogni modifica è conservata nello storico, mai sovrascritta di nascosto.",
}

export default holdingCategories
