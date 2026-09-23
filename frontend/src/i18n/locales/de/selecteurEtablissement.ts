import type fr from '../fr/selecteurEtablissement'
import type { Structure } from '../../types'

/** Allemand — espace « selecteurEtablissement » (backlog § BL.2), traduit depuis le français. */
const selecteurEtablissement: Structure<typeof fr> = {
  etablissement: "Institut",
  sansEtablissement: "— Ohne Institut —",
  choisir: "— Auswählen —",
  nouvelEtablissement: "+ Neues Institut...",
  boursoramaCaisseDEpargne: "Boursorama, Caisse d'Épargne...",
  nomNouvelAria: "Name des neuen Instituts ({champ})",
}

export default selecteurEtablissement
