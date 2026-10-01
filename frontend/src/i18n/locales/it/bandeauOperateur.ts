import type fr from '../fr/bandeauOperateur'
import type { Structure } from '../../types'

/** Italien — espace « bandeauOperateur » (backlog § BK.2d), traduit depuis le français. */
const bandeauOperateur: Structure<typeof fr> = {
  titre: "Crea l'account operatore",
  texte: "L'operatore amministra l'installazione — creare, sospendere o eliminare nuclei, regolare le attività pianificate e il logo del pulsante SSO — senza mai vedere un patrimonio. È un account distinto dal tuo, che non appartiene a nessun nucleo. Facoltativo finché sei solo su questa installazione; necessario per accogliere altri nuclei.",
  ouvrir: "Crea l'operatore…",
}

export default bandeauOperateur
