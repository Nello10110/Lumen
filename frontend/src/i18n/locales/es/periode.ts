import type fr from '../fr/periode'
import type { Structure } from '../../types'

/** Espagnol — espace « periode » (backlog § BL.2), traduit depuis le français. */
const periode: Structure<typeof fr> = {
  surLaPeriodeSelectionnee: "en el periodo seleccionado",
  depuisLeDebutDuSuivi: "desde el inicio del seguimiento",
  surLeDernierMois: "en el último mes",
  surLes3DerniersMois: "en los últimos 3 meses",
  surLaDerniereAnnee: "en el último año",
  surLes5DernieresAnnees: "en los últimos 5 años",
  court1M: "1M",
  court3M: "3M",
  court1A: "1A",
  court5A: "5A",
  courtTout: "Todo",
}

export default periode
