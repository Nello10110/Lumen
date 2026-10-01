import type fr from '../fr/comptesSansFoyer'
import type { Structure } from '../../types'

/** Anglais — espace « comptesSansFoyer » (backlog § BK.2d), traduit depuis le français. */
const comptesSansFoyer: Structure<typeof fr> = {
  titre: "Accounts without a household",
  intro: "Accounts that can sign in but belong to no household — deleting or leaving their last household leaves them here. An account deletes itself; as long as it has no household left, you can do it for them.",
  aucun: "No accounts without a household.",
  creeLe: "Created on {date}",
  derniereConnexion: "last sign-in {date}",
  jamaisConnecte: "never signed in",
  supprimer: "Delete",
  supprimerAria: "Delete the account {nom}",
  supprimerTitre: "Delete the account {nom}?",
  supprimerExplication: "The account, its sessions and its access log will be permanently erased.",
  supprimerDefinitivement: "Permanently delete the account",
}

export default comptesSansFoyer
