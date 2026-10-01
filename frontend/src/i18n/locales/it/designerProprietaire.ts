import type fr from '../fr/designerProprietaire'
import type { Structure } from '../../types'

/** Italien — espace « designerProprietaire » (backlog § BK.2d), traduit depuis le français. */
const designerProprietaire: Structure<typeof fr> = {
  titre: "Nuovo proprietario del nucleo {foyer}",
  aucunMembre: "Questo nucleo non ha nessun membro da designare: solo un membro può diventare proprietario (un ospite no).",
  explication: "Designa un membro del nucleo come proprietario — utile quando il proprietario non c'è più. L'eventuale proprietario attuale diventa un semplice membro.",
  membreLabel: "Membro",
  choisir: "Scegli un membro…",
  annuler: "Annulla",
  designer: "Designa come proprietario",
}

export default designerProprietaire
