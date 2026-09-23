import type fr from '../fr/analysePage'
import type { Structure } from '../../types'

/** Italien — espace « analysePage » (backlog § BL.2), traduit depuis le français. */
const analysePage: Structure<typeof fr> = {
  analyse: "Analisi",
  actualisation: "Aggiornamento...",
  actualiser: "Aggiorna",
  sectionsDeLAnalyse: "Sezioni dell'analisi",
  valeurDesPositions: "Valore delle posizioni",
  scoreDeDiversification: "Punteggio di diversificazione",
  repartitionGeographique: "Ripartizione geografica",
  geographieDesFondsEtfIssue: "Geografia dei fondi/ETF tratta dalla loro composizione reale (10 maggiori righe, estrapolate al 100% del fondo) quando Yahoo Finance la fornisce, altrimenti stimata dall’indice seguito dal fondo (vedi il dettaglio sulla qualità dei dati qui sotto); settore dei fondi basato sulla loro composizione completa. Clicca su una barra (o una riga della tabella a schermo intero) per vedere il dettaglio delle righe.",
  repartitionSectorielle: "Ripartizione settoriale",
  ongletPortefeuille: "Portafoglio",
  ongletRepartition: "Ripartizione",
  ongletDiagnostic: "Diagnosi",
  ongletEvolution: "Andamento",
  ongletRevenus: "Redditi",
  ongletAchatLocation: "Acquisto vs affitto",
  ongletSimulateur: "Simulatore",
}

export default analysePage
