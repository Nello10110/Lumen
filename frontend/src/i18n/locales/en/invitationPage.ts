import type fr from '../fr/invitationPage'
import type { Structure } from '../../types'

/** Anglais — espace « invitationPage » (backlog § BK.2b), traduit depuis le français. */
const invitationPage: Structure<typeof fr> = {
  titre: "Invitation to join a household",
  lienInvalide: "This invitation link is invalid, expired or already used. Ask the person who invited you for a new link.",
  retourAccueil: "Back to the app",
  inviteAvecNom: "{foyer} invites you to join their household. Proposed role: {role}.",
  inviteSansNom: "You are invited to join a household. Proposed role: {role}.",
  pour: "Invitation intended for: {libelle}",
  nomUtilisateur: "Username",
  motDePasse: "Password",
  huitCaracteres: "At least 8 characters",
  confirmation: "Confirm the password",
  motsDePasseDifferents: "The two passwords do not match.",
  creerEtRejoindre: "Create my account and join the household",
  seConnecterEtRejoindre: "Sign in and join the household",
  unInstant: "One moment...",
  ou: "or",
  continuerAvec: "Continue with {fournisseur}",
  dejaUnCompte: "I already have an account",
  pasDeCompte: "I don't have an account yet",
  connecteEn: "You are signed in as {nom}.",
  ajouteAuxFoyers: "This household will be added to the ones this account already has, if any: the sidebar will let you switch between them.",
  rejoindre: "Join this household",
  autreCompte: "Use another account",
  ouvrirApplication: "Open the app without joining",
  titreCreation: "Invitation to create your household",
  inviteCreation: "You are invited to create your household: you will be its owner.",
  creerLeFoyer: "Create my household",
  ajouteAuxFoyersCreation: "Your new household will be added to the ones this account already has, if any: the sidebar will let you switch between them.",
  creerEtCreerFoyer: "Create my account and my household",
  seConnecterEtCreerFoyer: "Sign in and create my household",
}

export default invitationPage
