import type fr from '../fr/transfertPropriete'
import type { Structure } from '../../types'

/** Italien — espace « transfertPropriete » (backlog § BK.2c), traduit depuis le français. */
const transfertPropriete: Structure<typeof fr> = {
  titre: "Trasferisci la proprietà del nucleo",
  explication: "Il membro scelto diventa proprietario del nucleo e tu diventi un semplice membro: non avrai più accesso alle Impostazioni né alla gestione dei membri. I dati restano nel nucleo, non viene spostato nulla. Solo il nuovo proprietario potrà restituirti la proprietà.",
  membreLabel: "Nuovo proprietario",
  choisir: "Scegli un membro…",
  confirmationLabel: "Per confermare, digita il suo nome utente: {nom}",
  annuler: "Annulla",
  confirmer: "Trasferisci la proprietà",
}

export default transfertPropriete
