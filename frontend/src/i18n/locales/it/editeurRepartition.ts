import type fr from '../fr/editeurRepartition'
import type { Structure } from '../../types'

/** Italien — espace « editeurRepartition » (backlog § BL.2), traduit depuis le français. */
const editeurRepartition: Structure<typeof fr> = {
  erreurMembres: "Impossibile caricare i membri del nucleo: {erreur}",
  proposition: "Nessuna ripartizione è salvata: ecco una proposta a quote uguali. Si applica solo una volta salvata.",
  divergente: "Le righe di questo conto non hanno tutte la stessa ripartizione. Salvare qui sotto le sostituirà tutte con questa.",
  enregistrement: "Salvataggio...",
}

export default editeurRepartition
