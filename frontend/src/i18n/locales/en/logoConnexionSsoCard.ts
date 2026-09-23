import type fr from '../fr/logoConnexionSsoCard'
import type { Structure } from '../../types'

/** Anglais — espace « logoConnexionSsoCard » (backlog § BL.2), traduit depuis le français. */
const logoConnexionSsoCard: Structure<typeof fr> = {
  logoDuBoutonDeConnexion: "SSO login button logo",
  lImageAfficheeAGauche: "The image shown to the left of the label on the login page. The rest of the SSO configuration (provider, credentials, button label) is set through environment variables, not here.",
  logoActuelDuBoutonDe: "Current SSO login button logo",
  aucun: "None",
  leBoutonAfficheCeLogo: "The button shows this logo followed by its label.",
  sansLogoLeBoutonN: "Without a logo, the button only shows its label — the default behavior.",
  envoi: "Uploading…",
  televerserUneImage: "Upload an image",
  retrait: "Removing…",
  retirerLeLogo: "Remove the logo",
  imageDuLogoDeConnexion: "SSO login logo image",
  adresseDUneImageLe: "Image address (the server downloads and stores it)",
  httpsAuthExempleFrLogo: "https://auth.example.com/logo.png",
  recuperation: "Fetching…",
  utiliserCetteAdresse: "Use this address",
}

export default logoConnexionSsoCard
