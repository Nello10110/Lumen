import type fr from '../fr/reglagesInstallation'
import type { Structure } from '../../types'

/** Espagnol — espace « reglagesInstallation » (backlog § BK.2d), traduit depuis le français. */
const reglagesInstallation: Structure<typeof fr> = {
  titre: "Creación de hogares",
  modeTitre: "¿Cómo nace un hogar?",
  modeIntro: "El modo elegido vale para toda la instalación.",
  modeFerme: "Cerrado",
  modeFermeAide: "Solo el operador crea un hogar, generando un enlace «crea tu hogar».",
  modeInvitation: "Por invitación",
  modeInvitationAide: "Un propietario también puede generar un enlace «crea tu hogar» para un allegado. Volver al modo cerrado desactiva los enlaces de los propietarios, no los del operador.",
  ssoCreeSonFoyer: "Una cuenta SSO nueva crea su hogar",
  ssoCreeSonFoyerAide: "Si se desactiva, una cuenta SSO nueva se crea sin hogar y espera una invitación.",
  compteSansFoyerCree: "Una cuenta sin hogar puede crear el suyo",
  compteSansFoyerCreeAide: "Si se desactiva, una cuenta sin hogar debe aceptar una invitación (o eliminarse).",
}

export default reglagesInstallation
