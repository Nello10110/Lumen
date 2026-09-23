import type fr from '../fr/periode'
import type { Structure } from '../../types'

/** Anglais — espace « periode » (backlog § BL.2), traduit depuis le français. */
const periode: Structure<typeof fr> = {
  surLaPeriodeSelectionnee: "over the selected period",
  depuisLeDebutDuSuivi: "since tracking began",
  surLeDernierMois: "over the last month",
  surLes3DerniersMois: "over the last 3 months",
  surLaDerniereAnnee: "over the last year",
  surLes5DernieresAnnees: "over the last 5 years",
  court1M: "1M",
  court3M: "3M",
  court1A: "1Y",
  court5A: "5Y",
  courtTout: "All",
}

export default periode
