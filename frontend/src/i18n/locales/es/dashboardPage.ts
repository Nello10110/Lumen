import type fr from '../fr/dashboardPage'
import type { Structure } from '../../types'

/** Espagnol — espace « dashboardPage » (backlog § BL.2), traduit depuis le français. */
const dashboardPage: Structure<typeof fr> = {
  tableauDeBord: "Panel",
  actualisation: "Actualizando...",
  actualiser: "Actualizar",
  aucunePositionDansLePortefeuille: "Ninguna posición en la cartera. Empieza por",
  importerTonPortefeuille: "importar tu cartera",
  actualiserLesCours: "Actualizar las cotizaciones",
  repartitionsRentabiliteQualiteDesDonnees: "Repartos, rentabilidad, calidad de los datos e ingresos tienen su propia pantalla:",
  voirLAnalyseDetaillee: "ver el análisis detallado",
  coursNonActualises: { one: "Tus cotizaciones no se actualizan desde hace {n} día. ¿Actualizarlas?", other: "Tus cotizaciones no se actualizan desde hace {n} días. ¿Actualizarlas?" },
}

export default dashboardPage
