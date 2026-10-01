import type fr from '../fr/creationOperateur'
import type { Structure } from '../../types'

/** Anglais — espace « creationOperateur » (backlog § BK.2d), traduit depuis le français. */
const creationOperateur: Structure<typeof fr> = {
  creer: "Create the operator account",
  creeTitre: "Operator account “{nom}” created.",
  creeExplication: "This account is separate from yours: it belongs to no household and sees no assets. To administer the installation (households, scheduled tasks, SSO button logo), sign out and sign in with it. The installation settings now leave your Settings screen.",
}

export default creationOperateur
