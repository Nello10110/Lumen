import type fr from '../fr/chargementCourbeLumen'
import type { Structure } from '../../types'

/** Anglais — espace « chargementCourbeLumen » (backlog § BL.2), traduit depuis le français. */
const chargementCourbeLumen: Structure<typeof fr> = {
  chargementDeLHistoriqueEn: "Loading history",
  lumenFaitLaLumiereSur: "Lumen is shedding light on your history…",
  seulementPourLesTitresJamais: "(only for securities never downloaded before)",
}

export default chargementCourbeLumen
