import type fr from '../fr/qualiteDonneesCard'
import type { Structure } from '../../types'

/** Anglais — espace « qualiteDonneesCard » (backlog § BL.2), traduit depuis le français. */
const qualiteDonneesCard: Structure<typeof fr> = {
  qualiteDesDonnees: "Data quality",
  estimeeParIndice: "{pct}% of the portfolio value ({valeur}) has a geographic allocation estimated from the index the fund tracks, for lack of detailed holdings.",
  nonCategorisee: "{pct}% of the portfolio value ({valeur}) has no geographic data available and appears as “Uncategorized”.",
  sansCotation: "{valeur} ({pct}%) is valued at cost for lack of an available price — this value goes as is into the diversification score and the rebalancing amounts in euros.",
}

export default qualiteDonneesCard
