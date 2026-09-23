import type fr from '../fr/selecteurEtablissement'
import type { Structure } from '../../types'

/** Espagnol — espace « selecteurEtablissement » (backlog § BL.2), traduit depuis le français. */
const selecteurEtablissement: Structure<typeof fr> = {
  etablissement: "Entidad",
  sansEtablissement: "— Sin entidad —",
  choisir: "— Elegir —",
  nouvelEtablissement: "+ Nueva entidad...",
  boursoramaCaisseDEpargne: "Boursorama, Caisse d'Épargne...",
  nomNouvelAria: "Nombre de la nueva entidad ({champ})",
}

export default selecteurEtablissement
