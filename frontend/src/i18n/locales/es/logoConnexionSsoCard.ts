import type fr from '../fr/logoConnexionSsoCard'
import type { Structure } from '../../types'

/** Espagnol — espace « logoConnexionSsoCard » (backlog § BL.2), traduit depuis le français. */
const logoConnexionSsoCard: Structure<typeof fr> = {
  logoDuBoutonDeConnexion: "Logo del botón de inicio de sesión SSO",
  lImageAfficheeAGauche: "La imagen que aparece a la izquierda del texto en la página de inicio de sesión. El resto de la configuración SSO (proveedor, credenciales, texto del botón) se ajusta mediante variables de entorno, no aquí.",
  logoActuelDuBoutonDe: "Logo actual del botón de inicio de sesión SSO",
  aucun: "Ninguno",
  leBoutonAfficheCeLogo: "El botón muestra este logo seguido de su texto.",
  sansLogoLeBoutonN: "Sin logo, el botón solo muestra su texto: es el comportamiento por defecto.",
  envoi: "Enviando…",
  televerserUneImage: "Subir una imagen",
  retrait: "Quitando…",
  retirerLeLogo: "Quitar el logo",
  imageDuLogoDeConnexion: "Imagen del logo de inicio de sesión SSO",
  adresseDUneImageLe: "Dirección de una imagen (el servidor la descarga y la almacena)",
  httpsAuthExempleFrLogo: "https://auth.ejemplo.es/logo.png",
  recuperation: "Recuperando…",
  utiliserCetteAdresse: "Usar esta dirección",
}

export default logoConnexionSsoCard
