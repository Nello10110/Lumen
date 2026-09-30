import type fr from '../fr/aucunFoyer'
import type { Structure } from '../../types'

/** Anglais — espace « aucunFoyer » (backlog § BK.2b), traduit depuis le français. */
const aucunFoyer: Structure<typeof fr> = {
  titre: "You don't belong to any household",
  connecteEn: "Signed in as {nom}.",
  explication: "Without a household there is no data to show. Join one with an invitation link, or create your own if the installation allows it.",
  vosFoyers: "Your households",
  ouvrir: "Open",
  rejoindreTitre: "Join a household",
  lienLabel: "Invitation link",
  lienAide: "Paste the link you received, or just the code after the “#”.",
  lienIncomplet: "This link does not contain an invitation code. Paste it in full, as it was sent to you.",
  rejoindre: "Join the household",
  creerTitre: "Create your own household",
  nomFoyerLabel: "Household name (optional)",
  creer: "Create my household",
  supprimer: "Delete my account",
  supprimerTitre: "Delete my account",
  supprimerExplication: "Your account, its login sessions and its access log will be permanently erased. This cannot be undone.",
  confirmationLabel: "To confirm, type your username: {nom}",
  annuler: "Cancel",
  supprimerConfirmer: "Delete permanently",
  deconnexion: "Sign out",
}

export default aucunFoyer
