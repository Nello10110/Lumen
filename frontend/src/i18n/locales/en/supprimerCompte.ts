import type fr from '../fr/supprimerCompte'
import type { Structure } from '../../types'

/** Anglais — espace « supprimerCompte » (backlog § BK.2c), traduit depuis le français. */
const supprimerCompte: Structure<typeof fr> = {
  menu: "Delete my account",
  titre: "Delete my account?",
  explication: "Your account, its login sessions and its access log will be permanently erased.",
  foyersSupprimes: { one: "This household will be deleted with your account, along with all its data: you are its only member.", other: "These {n} households will be deleted with your account, along with all their data: you are their only member." },
  foyersQuittes: { one: "You will leave this household, whose data stays with its other members:", other: "You will leave these {n} households, whose data stays with their other members:" },
  irreversible: "This cannot be undone.",
  confirmationLabel: "To confirm, type your username: {nom}",
  annuler: "Cancel",
  fermer: "Close",
  supprimer: "Delete permanently",
  bloqueIntro: { one: "You cannot delete your account for now: you own a household that has other accounts.", other: "You cannot delete your account for now: you own {n} households that have other accounts." },
  autresComptes: { one: "{n} other account", other: "{n} other accounts" },
  bloqueSolution: "To go ahead, open that household (household selector), then transfer its ownership in Settings → Accounts & security, or delete it in Settings → General.",
}

export default supprimerCompte
