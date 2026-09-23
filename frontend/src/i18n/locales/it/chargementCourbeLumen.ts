import type fr from '../fr/chargementCourbeLumen'
import type { Structure } from '../../types'

/** Italien — espace « chargementCourbeLumen » (backlog § BL.2), traduit depuis le français. */
const chargementCourbeLumen: Structure<typeof fr> = {
  chargementDeLHistoriqueEn: "Caricamento dello storico in corso",
  lumenFaitLaLumiereSur: "Lumen sta facendo luce sul Suo storico…",
  seulementPourLesTitresJamais: "(solo per i titoli mai scaricati)",
}

export default chargementCourbeLumen
