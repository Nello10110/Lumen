import type fr from '../fr/qualiteDonneesCard'
import type { Structure } from '../../types'

/** Espagnol — espace « qualiteDonneesCard » (backlog § BL.2), traduit depuis le français. */
const qualiteDonneesCard: Structure<typeof fr> = {
  qualiteDesDonnees: "Calidad de los datos",
  estimeeParIndice: "El {pct} % del valor de la cartera ({valeur}) tiene un reparto geográfico estimado a partir del índice que sigue el fondo, a falta de composición detallada.",
  nonCategorisee: "El {pct} % del valor de la cartera ({valeur}) no tiene datos geográficos disponibles y aparece como «Sin categorizar».",
  sansCotation: "{valeur} ({pct} %) se valoran a su precio de coste a falta de cotización disponible: este valor entra tal cual en la puntuación de diversificación y en los importes de reequilibrio en euros.",
}

export default qualiteDonneesCard
