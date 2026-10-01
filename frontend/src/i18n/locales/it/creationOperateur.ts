import type fr from '../fr/creationOperateur'
import type { Structure } from '../../types'

/** Italien — espace « creationOperateur » (backlog § BK.2d), traduit depuis le français. */
const creationOperateur: Structure<typeof fr> = {
  creer: "Crea l'account operatore",
  creeTitre: "Account operatore «{nom}» creato.",
  creeExplication: "Questo account è distinto dal tuo: non appartiene a nessun nucleo e non vede nessun patrimonio. Per amministrare l'installazione (nuclei, attività pianificate, logo del pulsante SSO), esci e accedi con questo account. Le impostazioni di installazione escono ora dalla tua schermata Impostazioni.",
}

export default creationOperateur
