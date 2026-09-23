import type fr from '../fr/ajoutCompteForm'
import type { Structure } from '../../types'

/** Italien — espace « ajoutCompteForm » (backlog § BL.2), traduit depuis le français. */
const ajoutCompteForm: Structure<typeof fr> = {
  nom: "Nome",
  peaLivretA: "PEA, Livret A...",
  type: "Tipo",
  valeurInitialeOptionnel: "Valore iniziale (€, facoltativo)",
  versementMensuelOptionnel: "Versamento mensile (€, facoltativo)",
  etablissement: "Istituto",
  nouveauCompte: "+ Nuovo conto",
  compteVide: "— Conto vuoto —",
  aideNom: "Il nome che LEI gli dà, non un numero di conto: «PEA Boursorama», «Livret A», «Appartamento Lione». È il nome che apparirà in tutta l’app.",
  aideEtablissement: "La banca o il broker che ospita questo conto: un conto deve sempre avere un istituto. Ne scelga uno esistente o lo crei al volo.",
}

export default ajoutCompteForm
