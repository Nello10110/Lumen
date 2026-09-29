import type fr from '../fr/selecteurCompte'
import type { Structure } from '../../types'

/** Allemand — espace « selecteurCompte » (backlog § BM.1), traduit depuis le français. */
const selecteurCompte: Structure<typeof fr> = {
  compte: "Konto *",
  choisir: "— Konto auswählen —",
  nouveauCompte: "+ Neues Konto...",
  sansEtablissement: "Ohne Institut",
  nomDuNouveauCompte: "Name des neuen Kontos *",
  exemplesNom: "Girokonto, Sparkonto...",
  etablissement: "Institut *",
  etablissementDuNouveauCompte: "Institut des neuen Kontos",
}

export default selecteurCompte
