import type fr from '../fr/editeurRepartition'
import type { Structure } from '../../types'

/** Anglais — espace « editeurRepartition » (backlog § BL.2), traduit depuis le français. */
const editeurRepartition: Structure<typeof fr> = {
  erreurMembres: "Unable to load the household members: {erreur}",
  proposition: "No split is saved: here is a proposal with equal shares. It only applies once saved.",
  divergente: "Not all the lines of this account have the same split. Saving below will replace them all with this one.",
  enregistrement: "Saving...",
}

export default editeurRepartition
