import type fr from '../fr/gestionFoyerCard'
import type { Structure } from '../../types'

/** Anglais — espace « gestionFoyerCard » (backlog § BL.2), traduit depuis le français. */
const gestionFoyerCard: Structure<typeof fr> = {
  comptesDuFoyer: "Household accounts",
  unMembrePeutConsulterEt: "A member can view and enter the household’s assets/loans/transactions, but not the situation indicators or security. A guest only sees, read-only, the net worth and portfolio of the holders assigned to them below.",
  aucunCompteAAfficher: "No account to display.",
  ajouteUnMembreOuUn: "Add a member or a guest with the form below.",
  enregistrer: "Save",
  annuler: "Cancel",
  modifier: "Edit",
  vous: "(you)",
  compteMotDePasseLocal: "Local password account",
  connexionLocale: "Local login",
  jamaisConnecte: "Never logged in",
  tropDeTentativesDeConnexion: "Too many recent failed login attempts",
  verrouilleJusquA: "Locked until",
  role: "Role",
  supprimer: "Delete",
  nomDUtilisateur: "Username",
  motDePasse: "Password",
  membreDuFoyer: "Household member",
  invite: "Guest",
  ajouter: "Add",
  aucunDetenteurDeclare: "No holder declared.",
  roleProprietaire: "Owner",
  roleMembre: "Household member",
  roleInvite: "Guest",
  ariaNomUtilisateurEdition: "Username of {nom} (editing)",
  ariaModifierNomUtilisateur: "Edit the username of {nom}",
  compteLieVia: "Account provisioned/linked via {fournisseur}",
  connexionSso: "SSO login ({fournisseur})",
  derniereConnexion: "Last login {date}",
  sessionsActives: { one: "{n} active session", other: "{n} active sessions" },
  ariaRole: "Role of {nom}",
  ariaSupprimerCompte: "Delete the account {nom}",
}

export default gestionFoyerCard
