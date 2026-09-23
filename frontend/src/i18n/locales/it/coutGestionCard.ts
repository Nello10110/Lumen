import type fr from '../fr/coutGestionCard'
import type { Structure } from '../../types'

/** Italien — espace « coutGestionCard » (backlog § BL.2), traduit depuis le français. */
const coutGestionCard: Structure<typeof fr> = {
  coutDeGestionAnnuelEstime: "Costo di gestione annuo stimato (fondi/ETF)",
  sur: "su",
  deFondsEtfDetenusDont: "di fondi/ETF detenuti, di cui",
  avecDesFraisDeGestion: "% con costi di gestione noti.",
  les: "I",
  restantsNOntPasEncore: "restanti non hanno ancora costi di gestione noti (recuperati una sola volta per fondo, man mano che si aggiorna): il costo reale è quindi sottostimato finché la copertura non raggiunge il 100%.",
}

export default coutGestionCard
