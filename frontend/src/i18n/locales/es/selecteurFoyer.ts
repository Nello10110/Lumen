import type fr from '../fr/selecteurFoyer'
import type { Structure } from '../../types'

/** Espagnol — espace « selecteurFoyer » (backlog § BK.2b), traduit depuis le français. */
const selecteurFoyer: Structure<typeof fr> = {
  aria: "Hogar actual",
  etiquette: "Hogar",
  choisir: "Elegir un hogar",
  sansNom: "Hogar sin nombre",
  option: "{foyer} · {role}",
}

export default selecteurFoyer
