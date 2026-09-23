import type fr from '../fr/detenteursSection'
import type { Structure } from '../../types'

/** Anglais — espace « detenteursSection » (backlog § BL.2), traduit depuis le français. */
const detenteursSection: Structure<typeof fr> = {
  detenteurs: "Holders",
  repartitionDeCetteLigneEntre: "Split of this line between the people declared in Settings — the total must be 100% (or stay at 0% not to split: 100% household implied).",
  cetteLigneAppartientAuCompte: "This line belongs to the account",
  definisLaPlutotUneSeule: "— rather set it once for the whole account from its sheet, if the account’s other lines should have the same split.",
  detenteur: "Holder",
  quotite: "Share",
  laPartDuGateauQui: "The slice of the pie that goes to each person on this asset or loan. The shares of a line always add up to 100%.",
  valeurDeLActifRevenant: "Value of the asset belonging to this holder, in proportion to their share, WITHOUT deducting the loan.",
  partDetenue: "Share held",
  partDetenueMoinsLaPart: "Share held MINUS the share of the linked loan’s outstanding principal. Identical to the share held if no loan is linked to this line.",
  partNette: "Net share",
  enregistrer: "Save",
  totalActuel: "Current total:",
  doitFaire100: "% (must equal 100%)",
  erreurDetenteurs: "Unable to load the holders: {erreur}",
}

export default detenteursSection
