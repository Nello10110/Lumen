import type fr from '../fr/ajoutValorisationForm'
import type { Structure } from '../../types'

/** Italien — espace « ajoutValorisationForm » (backlog § BL.2), traduit depuis le français. */
const ajoutValorisationForm: Structure<typeof fr> = {
  valeur: "Valore (€)",
  date: "Data",
  dontVersement: "Di cui versamento (€)",
  dontPlusValue: "Di cui plusvalenza (€)",
  enregistrement: "Salvataggio...",
  ajouterUneValorisation: "Aggiungi una valutazione",
  versementOuPlusValueAu: "Versamento o plusvalenza, a scelta: l’altro si ricava automaticamente dall’andamento dal punto precedente. Lasci vuoto se non lo sa: la schermata Report continuerà a stimare il guadagno con il tasso dichiarato.",
}

export default ajoutValorisationForm
