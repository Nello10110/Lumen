import type fr from '../fr/journalAccesCard'
import type { Structure } from '../../types'

/** Espagnol — espace « journalAccesCard » (backlog § BL.2), traduit depuis le français. */
const journalAccesCard: Structure<typeof fr> = {
  journalDAcces: "Registro de accesos",
  historiqueDesConnexionsEtDeconnexions: "Historial de inicios y cierres de sesión, correctos o no.",
  retournerEnPage1: "Volver a la página 1",
  deconnexion: "cierre de sesión",
  ipInconnue: "IP desconocida",
  succes: "Correcto",
  pagePrecedente: "Página anterior",
  page: "Página",
  pageSuivante: "Página siguiente",
  aucuneEntree: "Ninguna entrada.",
  aucuneEntreeSurCettePage: "Ninguna entrada en esta página.",
  connexion: "inicio de sesión",
  echec: "Error ({raison})",
  raisonCompteVerrouille: "cuenta bloqueada",
  raisonCompteInconnu: "cuenta desconocida",
  raisonCompteSsoSeul: "cuenta solo SSO",
  raisonMotDePasseIncorrect: "contraseña incorrecta",
  raisonOidcEchec: "error de SSO",
}

export default journalAccesCard
