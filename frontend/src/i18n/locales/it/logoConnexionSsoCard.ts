import type fr from '../fr/logoConnexionSsoCard'
import type { Structure } from '../../types'

/** Italien — espace « logoConnexionSsoCard » (backlog § BL.2), traduit depuis le français. */
const logoConnexionSsoCard: Structure<typeof fr> = {
  logoDuBoutonDeConnexion: "Logo del pulsante di accesso SSO",
  lImageAfficheeAGauche: "L’immagine mostrata a sinistra dell’etichetta nella pagina di accesso. Il resto della configurazione SSO (fornitore, credenziali, etichetta del pulsante) si imposta tramite variabili d’ambiente, non qui.",
  logoActuelDuBoutonDe: "Logo attuale del pulsante di accesso SSO",
  aucun: "Nessuno",
  leBoutonAfficheCeLogo: "Il pulsante mostra questo logo seguito dalla sua etichetta.",
  sansLogoLeBoutonN: "Senza logo, il pulsante mostra solo la sua etichetta: è il comportamento predefinito.",
  envoi: "Invio…",
  televerserUneImage: "Carica un’immagine",
  retrait: "Rimozione…",
  retirerLeLogo: "Rimuovi il logo",
  imageDuLogoDeConnexion: "Immagine del logo di accesso SSO",
  adresseDUneImageLe: "Indirizzo di un’immagine (il server la scarica e la memorizza)",
  httpsAuthExempleFrLogo: "https://auth.esempio.it/logo.png",
  recuperation: "Recupero…",
  utiliserCetteAdresse: "Usa questo indirizzo",
}

export default logoConnexionSsoCard
