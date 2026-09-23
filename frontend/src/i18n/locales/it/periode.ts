import type fr from '../fr/periode'
import type { Structure } from '../../types'

/** Italien — espace « periode » (backlog § BL.2), traduit depuis le français. */
const periode: Structure<typeof fr> = {
  surLaPeriodeSelectionnee: "nel periodo selezionato",
  depuisLeDebutDuSuivi: "dall'inizio del monitoraggio",
  surLeDernierMois: "nell'ultimo mese",
  surLes3DerniersMois: "negli ultimi 3 mesi",
  surLaDerniereAnnee: "nell'ultimo anno",
  surLes5DernieresAnnees: "negli ultimi 5 anni",
  court1M: "1M",
  court3M: "3M",
  court1A: "1A",
  court5A: "5A",
  courtTout: "Tutto",
}

export default periode
