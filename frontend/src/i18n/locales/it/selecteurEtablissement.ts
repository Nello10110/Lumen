import type fr from '../fr/selecteurEtablissement'
import type { Structure } from '../../types'

/** Italien — espace « selecteurEtablissement » (backlog § BL.2), traduit depuis le français. */
const selecteurEtablissement: Structure<typeof fr> = {
  etablissement: "Istituto",
  sansEtablissement: "— Senza istituto —",
  choisir: "— Scegli —",
  nouvelEtablissement: "+ Nuovo istituto...",
  boursoramaCaisseDEpargne: "Boursorama, Caisse d'Épargne...",
  nomNouvelAria: "Nome del nuovo istituto ({champ})",
}

export default selecteurEtablissement
