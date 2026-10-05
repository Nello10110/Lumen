import type fr from '../fr/detenteursSection'
import type { Structure } from '../../types'

/** Italien — espace « detenteursSection » (backlog § BL.2), traduit depuis le français. */
const detenteursSection: Structure<typeof fr> = {
  detenteurs: "Membri del nucleo",
  introduction: "Ripartisci questa riga tra i membri del nucleo. La somma deve fare 100 %; con 0 % ovunque, la riga resta all’intero nucleo.",
  cetteLigneAppartientAuCompte: "Questa riga appartiene al conto",
  definisLaPlutotUneSeule: "— definiscila piuttosto una sola volta per tutto il conto dalla sua scheda, se le altre righe del conto devono avere la stessa ripartizione.",
  enregistrer: "Salva la ripartizione",
  repartitionEnregistree: "Ripartizione salvata.",
  aucunMembre: "Nessun membro del nucleo è ancora dichiarato: questa riga appartiene all’intero nucleo. Aggiungi un membro per ripartirla.",
  ajouterUnMembre: "Aggiungi un membro del nucleo",
}

export default detenteursSection
