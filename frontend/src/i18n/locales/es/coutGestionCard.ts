import type fr from '../fr/coutGestionCard'
import type { Structure } from '../../types'

/** Espagnol — espace « coutGestionCard » (backlog § BL.2), traduit depuis le français. */
const coutGestionCard: Structure<typeof fr> = {
  coutDeGestionAnnuelEstime: "Coste de gestión anual estimado (fondos/ETF)",
  sur: "sobre",
  deFondsEtfDetenusDont: "de fondos/ETF en cartera, de los cuales",
  avecDesFraisDeGestion: "% con comisiones de gestión conocidas.",
  les: "Los",
  restantsNOntPasEncore: "restantes aún no tienen comisiones de gestión conocidas (se obtienen una sola vez por fondo, a medida que se actualiza): el coste real está por tanto subestimado mientras la cobertura no llegue al 100 %.",
}

export default coutGestionCard
