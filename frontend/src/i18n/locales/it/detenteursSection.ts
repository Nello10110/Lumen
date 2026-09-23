import type fr from '../fr/detenteursSection'
import type { Structure } from '../../types'

/** Italien — espace « detenteursSection » (backlog § BL.2), traduit depuis le français. */
const detenteursSection: Structure<typeof fr> = {
  detenteurs: "Titolari",
  repartitionDeCetteLigneEntre: "Ripartizione di questa riga tra le persone indicate in Impostazioni: la somma deve fare 100% (o restare a 0% per non ripartire: 100% nucleo implicito).",
  cetteLigneAppartientAuCompte: "Questa riga appartiene al conto",
  definisLaPlutotUneSeule: "— definiscila piuttosto una sola volta per tutto il conto dalla sua scheda, se le altre righe del conto devono avere la stessa ripartizione.",
  detenteur: "Titolare",
  quotite: "Quota",
  laPartDuGateauQui: "La fetta di torta che spetta a ciascuna persona su questo bene o prestito. La somma delle quote di una riga fa sempre 100%.",
  valeurDeLActifRevenant: "Valore dell'attività spettante a questo titolare, in proporzione alla sua quota, SENZA dedurre il prestito.",
  partDetenue: "Parte detenuta",
  partDetenueMoinsLaPart: "Parte detenuta MENO la parte del capitale residuo del prestito collegato. Identica alla parte detenuta se nessun prestito è collegato a questa riga.",
  partNette: "Parte netta",
  enregistrer: "Salva",
  totalActuel: "Totale attuale:",
  doitFaire100: "% (deve fare 100%)",
  erreurDetenteurs: "Impossibile caricare i titolari: {erreur}",
}

export default detenteursSection
