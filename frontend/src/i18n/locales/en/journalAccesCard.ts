import type fr from '../fr/journalAccesCard'
import type { Structure } from '../../types'

/** Anglais — espace « journalAccesCard » (backlog § BL.2), traduit depuis le français. */
const journalAccesCard: Structure<typeof fr> = {
  journalDAcces: "Access log",
  historiqueDesConnexionsEtDeconnexions: "History of logins and logouts, successful or not.",
  retournerEnPage1: "Back to page 1",
  deconnexion: "logout",
  ipInconnue: "Unknown IP",
  succes: "Success",
  pagePrecedente: "Previous page",
  page: "Page",
  pageSuivante: "Next page",
  aucuneEntree: "No entry.",
  aucuneEntreeSurCettePage: "No entry on this page.",
  connexion: "login",
  echec: "Failure ({raison})",
  raisonCompteVerrouille: "account locked",
  raisonCompteInconnu: "unknown account",
  raisonCompteSsoSeul: "SSO-only account",
  raisonMotDePasseIncorrect: "wrong password",
  raisonOidcEchec: "SSO failure",
  descriptionComplet: "Every sign-in on the installation, including attempts on an unknown username.",
  liaisonSso: "SSO link",
  raisonOperateurSansSso: "an operator does not sign in with SSO",
}

export default journalAccesCard
