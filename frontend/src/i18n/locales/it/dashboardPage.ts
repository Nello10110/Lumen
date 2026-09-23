import type fr from '../fr/dashboardPage'
import type { Structure } from '../../types'

/** Italien — espace « dashboardPage » (backlog § BL.2), traduit depuis le français. */
const dashboardPage: Structure<typeof fr> = {
  tableauDeBord: "Pannello",
  actualisation: "Aggiornamento...",
  actualiser: "Aggiorna",
  aucunePositionDansLePortefeuille: "Nessuna posizione nel portafoglio. Inizia",
  importerTonPortefeuille: "importando il tuo portafoglio",
  actualiserLesCours: "Aggiorna le quotazioni",
  repartitionsRentabiliteQualiteDesDonnees: "Ripartizioni, rendimento, qualità dei dati e redditi hanno una schermata dedicata:",
  voirLAnalyseDetaillee: "vedi l'analisi dettagliata",
  coursNonActualises: { one: "Le tue quotazioni non sono aggiornate da {n} giorno: aggiornarle?", other: "Le tue quotazioni non sono aggiornate da {n} giorni: aggiornarle?" },
}

export default dashboardPage
