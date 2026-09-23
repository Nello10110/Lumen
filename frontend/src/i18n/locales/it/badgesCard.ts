import type fr from '../fr/badgesCard'
import type { Structure } from '../../types'

/** Italien — espace « badgesCard » (backlog § BL.2), traduit depuis le français. */
const badgesCard: Structure<typeof fr> = {
  badges: "Badge",
  unePetiteGalerieStrictementPersonnelle: "Una piccola galleria strettamente personale: mai condivisa, mai confrontata. Premia la regolarità del monitoraggio, mai l’importo investito.",
  obtenuLe: "Ottenuto il",
  pasEncoreObtenu: "Non ancora ottenuto",
}

export default badgesCard
