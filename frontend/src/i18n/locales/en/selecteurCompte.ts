import type fr from '../fr/selecteurCompte'
import type { Structure } from '../../types'

/** Anglais — espace « selecteurCompte » (backlog § BM.1), traduit depuis le français. */
const selecteurCompte: Structure<typeof fr> = {
  compte: "Account *",
  choisir: "— Choose an account —",
  nouveauCompte: "+ New account...",
  sansEtablissement: "No institution",
  nomDuNouveauCompte: "New account name *",
  exemplesNom: "Current account, savings account...",
  etablissement: "Institution *",
  etablissementDuNouveauCompte: "Institution of the new account",
}

export default selecteurCompte
