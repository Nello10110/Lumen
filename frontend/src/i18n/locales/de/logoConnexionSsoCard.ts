import type fr from '../fr/logoConnexionSsoCard'
import type { Structure } from '../../types'

/** Allemand — espace « logoConnexionSsoCard » (backlog § BL.2), traduit depuis le français. */
const logoConnexionSsoCard: Structure<typeof fr> = {
  logoDuBoutonDeConnexion: "Logo der SSO-Anmeldeschaltfläche",
  lImageAfficheeAGauche: "Das Bild links neben der Beschriftung auf der Anmeldeseite. Die übrige SSO-Konfiguration (Anbieter, Zugangsdaten, Schaltflächentext) erfolgt über Umgebungsvariablen, nicht hier.",
  logoActuelDuBoutonDe: "Aktuelles Logo der SSO-Anmeldeschaltfläche",
  aucun: "Keins",
  leBoutonAfficheCeLogo: "Die Schaltfläche zeigt dieses Logo, gefolgt von ihrer Beschriftung.",
  sansLogoLeBoutonN: "Ohne Logo zeigt die Schaltfläche nur ihre Beschriftung — das Standardverhalten.",
  envoi: "Wird hochgeladen…",
  televerserUneImage: "Bild hochladen",
  retrait: "Wird entfernt…",
  retirerLeLogo: "Logo entfernen",
  imageDuLogoDeConnexion: "Bild des SSO-Anmeldelogos",
  adresseDUneImageLe: "Adresse eines Bildes (der Server lädt es herunter und speichert es)",
  httpsAuthExempleFrLogo: "https://auth.beispiel.de/logo.png",
  recuperation: "Wird abgerufen…",
  utiliserCetteAdresse: "Diese Adresse verwenden",
}

export default logoConnexionSsoCard
