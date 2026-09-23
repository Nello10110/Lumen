import type fr from '../fr/periode'
import type { Structure } from '../../types'

/** Allemand — espace « periode » (backlog § BL.2), traduit depuis le français. */
const periode: Structure<typeof fr> = {
  surLaPeriodeSelectionnee: "im gewählten Zeitraum",
  depuisLeDebutDuSuivi: "seit Beginn der Erfassung",
  surLeDernierMois: "im letzten Monat",
  surLes3DerniersMois: "in den letzten 3 Monaten",
  surLaDerniereAnnee: "im letzten Jahr",
  surLes5DernieresAnnees: "in den letzten 5 Jahren",
  court1M: "1M",
  court3M: "3M",
  court1A: "1J",
  court5A: "5J",
  courtTout: "Alles",
}

export default periode
