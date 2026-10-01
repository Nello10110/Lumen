import type fr from '../fr/reglagesInstallation'
import type { Structure } from '../../types'

/** Anglais — espace « reglagesInstallation » (backlog § BK.2d), traduit depuis le français. */
const reglagesInstallation: Structure<typeof fr> = {
  titre: "How households are born",
  modeTitre: "How is a household created?",
  modeIntro: "The chosen mode applies to the whole installation.",
  modeFerme: "Closed",
  modeFermeAide: "Only the operator creates a household, by generating a “create your household” link.",
  modeInvitation: "By invitation",
  modeInvitationAide: "An owner can also generate a “create your household” link for someone close. Switching back to closed mode turns off the owners' links, not the operator's.",
  ssoCreeSonFoyer: "A new SSO account creates its household",
  ssoCreeSonFoyerAide: "When off, a new SSO account is created without a household and waits for an invitation.",
  compteSansFoyerCree: "An account without a household can create its own",
  compteSansFoyerCreeAide: "When off, an account without a household must accept an invitation (or be deleted).",
}

export default reglagesInstallation
