import type fr from '../fr/foyerCard'
import type { Structure } from '../../types'

/** Anglais — espace « foyerCard » (backlog § BL.2), traduit depuis le français. */
const foyerCard: Structure<typeof fr> = {
  nomEnregistre: "Name saved.",
  monFoyer: "My household",
  leNomDuFoyerEst: "The household name is visible to all its accounts (owner, members, guests). Once set, it is also used as the confirmation phrase before a full data reset.",
  nomDuFoyer: "Household name",
  familleDupont: "The Smith family",
  enregistrement: "Saving…",
  enregistrer: "Save",
}

export default foyerCard
