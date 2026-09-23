import type fr from '../fr/chargementCourbeLumen'
import type { Structure } from '../../types'

/** Allemand — espace « chargementCourbeLumen » (backlog § BL.2), traduit depuis le français. */
const chargementCourbeLumen: Structure<typeof fr> = {
  chargementDeLHistoriqueEn: "Historie wird geladen",
  lumenFaitLaLumiereSur: "Lumen bringt Licht in Ihre Historie…",
  seulementPourLesTitresJamais: "(nur für noch nie geladene Wertpapiere)",
}

export default chargementCourbeLumen
