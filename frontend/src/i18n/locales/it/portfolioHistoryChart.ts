import type fr from '../fr/portfolioHistoryChart'
import type { Structure } from '../../types'

/** Italien — espace « portfolioHistoryChart » (backlog § BL.2), traduit depuis le français. */
const portfolioHistoryChart: Structure<typeof fr> = {
  superposeLInvestiSousLe: "Sovrappone l'investito sotto il totale: la fascia visibile tra le due curve sono i guadagni.",
  modeEtage: "Modalità sovrapposta",
  periodeDuGraphique: "Periodo del grafico",
  pasEncoreDHistoriqueDisponible: "Nessuno storico ancora disponibile.",
  investi: "Investito",
  gains: "Guadagni",
  periodeDuGraphiqueMobile: "Periodo del grafico (mobile)",
  gainsInclutLesVentesRealisees: "«Guadagni» include vendite realizzate, dividendi e interessi incassati: la stessa cifra del Guadagno/Perdita totale della scheda Rendimento complessivo.",
  pourLImmobilierLEpargne: "Per immobili/risparmio, solo un versamento dichiarato esplicitamente conta come «Investito»: un aumento non dichiarato è trattato come guadagno.",
}

export default portfolioHistoryChart
