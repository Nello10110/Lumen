import type fr from '../fr/selecteurFoyer'
import type { Structure } from '../../types'

/** Anglais — espace « selecteurFoyer » (backlog § BK.2b), traduit depuis le français. */
const selecteurFoyer: Structure<typeof fr> = {
  aria: "Current household",
  etiquette: "Household",
  choisir: "Choose a household",
  sansNom: "Unnamed household",
  option: "{foyer} · {role}",
}

export default selecteurFoyer
