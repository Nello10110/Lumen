import type fr from '../fr/detenteursSection'
import type { Structure } from '../../types'

/** Anglais — espace « detenteursSection » (backlog § BL.2), traduit depuis le français. */
const detenteursSection: Structure<typeof fr> = {
  detenteurs: "Household members",
  introduction: "Split this line between the household members. The total must be 100%; at 0% everywhere, the line stays with the whole household.",
  cetteLigneAppartientAuCompte: "This line belongs to the account",
  definisLaPlutotUneSeule: "— rather set it once for the whole account from its sheet, if the account’s other lines should have the same split.",
  enregistrer: "Save the split",
  repartitionEnregistree: "Split saved.",
  aucunMembre: "No household member has been declared yet: this line belongs to the whole household. Add a member to split it.",
  ajouterUnMembre: "Add a household member",
}

export default detenteursSection
