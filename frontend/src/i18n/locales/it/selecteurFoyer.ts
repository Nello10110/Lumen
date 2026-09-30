import type fr from '../fr/selecteurFoyer'
import type { Structure } from '../../types'

/** Italien — espace « selecteurFoyer » (backlog § BK.2b), traduit depuis le français. */
const selecteurFoyer: Structure<typeof fr> = {
  aria: "Nucleo corrente",
  etiquette: "Nucleo",
  choisir: "Scegli un nucleo",
  sansNom: "Nucleo senza nome",
  option: "{foyer} · {role}",
}

export default selecteurFoyer
