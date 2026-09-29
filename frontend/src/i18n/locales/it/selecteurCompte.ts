import type fr from '../fr/selecteurCompte'
import type { Structure } from '../../types'

/** Italien — espace « selecteurCompte » (backlog § BM.1), traduit depuis le français. */
const selecteurCompte: Structure<typeof fr> = {
  compte: "Conto *",
  choisir: "— Scegli un conto —",
  nouveauCompte: "+ Nuovo conto...",
  sansEtablissement: "Senza istituto",
  nomDuNouveauCompte: "Nome del nuovo conto *",
  exemplesNom: "Conto corrente, libretto di risparmio...",
  etablissement: "Istituto *",
  etablissementDuNouveauCompte: "Istituto del nuovo conto",
}

export default selecteurCompte
