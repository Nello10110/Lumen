import type fr from '../fr/holdingDetailContent'
import type { Structure } from '../../types'

/** Italien — espace « holdingDetailContent » (backlog § BL.2), traduit depuis le français. */
const holdingDetailContent: Structure<typeof fr> = {
  residencePrincipale: "Abitazione principale",
  depuisLAchat: "dall'acquisto",
  sectionsDeLaFiche: "Sezioni della scheda",
  quantite: "Quantità",
  prixDeRevient: "Prezzo di carico",
  prixActuel: "Prezzo attuale",
  valeur: "Valore",
  depuisAchat: "Dall'acquisto",
  rendementAnnualise: "Rendimento annualizzato",
  indisponibleDetentionTropRecenteOu: "non disponibile: detenzione troppo recente, o nessuna vendita/reddito noto dall'acquisto",
  secteur: "Settore",
  pays: "Paese",
  emetteurResumeFrais: "Emittente, sintesi e costi",
  emetteur: "Emittente:",
  informationsNonDisponibles: "Informazioni non disponibili.",
  fraisDeGestionAnnuels: "Costi di gestione annui",
  fraisDeTransactionPayesCumules: "Costi di transazione pagati (cumulati)",
  repartitionGeographique: "Ripartizione geografica",
  repartitionSectorielle: "Ripartizione settoriale",
  repartitionGeographiqueDetaillee: "Ripartizione geografica dettagliata",
  repartitionSectorielleDetaillee: "Ripartizione settoriale dettagliata",
  compositionEnActions10Plus: "Composizione in azioni (le 10 maggiori righe del fondo)",
  action: "Azione",
  proportion: "Peso",
  ongletApercu: "Panoramica",
  ongletAnalyse: "Analisi",
  ongletParametres: "Parametri",
}

export default holdingDetailContent
