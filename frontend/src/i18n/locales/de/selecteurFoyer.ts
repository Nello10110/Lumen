import type fr from '../fr/selecteurFoyer'
import type { Structure } from '../../types'

/** Allemand — espace « selecteurFoyer » (backlog § BK.2b), traduit depuis le français. */
const selecteurFoyer: Structure<typeof fr> = {
  aria: "Aktueller Haushalt",
  etiquette: "Haushalt",
  choisir: "Haushalt wählen",
  sansNom: "Haushalt ohne Namen",
  option: "{foyer} · {role}",
}

export default selecteurFoyer
