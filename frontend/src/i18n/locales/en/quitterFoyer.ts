import type fr from '../fr/quitterFoyer'
import type { Structure } from '../../types'

/** Anglais — espace « quitterFoyer » (backlog § BK.2b), traduit depuis le français. */
const quitterFoyer: Structure<typeof fr> = {
  menu: "Leave this household",
  titre: "Leave this household?",
  explication: "You will no longer have access to its data, which stays with the household. To join it again, its owner will have to send you a new invitation.",
  dernierFoyer: "This is your last household: you will have no access to any data until you join another household with an invitation, or create your own. Your account is not deleted.",
  annuler: "Cancel",
  confirmer: "Leave the household",
}

export default quitterFoyer
