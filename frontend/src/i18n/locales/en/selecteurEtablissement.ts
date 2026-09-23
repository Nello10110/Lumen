import type fr from '../fr/selecteurEtablissement'
import type { Structure } from '../../types'

/** Anglais — espace « selecteurEtablissement » (backlog § BL.2), traduit depuis le français. */
const selecteurEtablissement: Structure<typeof fr> = {
  etablissement: "Institution",
  sansEtablissement: "— No institution —",
  choisir: "— Choose —",
  nouvelEtablissement: "+ New institution...",
  boursoramaCaisseDEpargne: "Boursorama, Caisse d'Épargne...",
  nomNouvelAria: "New institution name ({champ})",
}

export default selecteurEtablissement
