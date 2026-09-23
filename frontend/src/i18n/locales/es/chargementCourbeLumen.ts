import type fr from '../fr/chargementCourbeLumen'
import type { Structure } from '../../types'

/** Espagnol — espace « chargementCourbeLumen » (backlog § BL.2), traduit depuis le français. */
const chargementCourbeLumen: Structure<typeof fr> = {
  chargementDeLHistoriqueEn: "Cargando el historial",
  lumenFaitLaLumiereSur: "Lumen está iluminando su historial…",
  seulementPourLesTitresJamais: "(solo para los títulos nunca descargados)",
}

export default chargementCourbeLumen
