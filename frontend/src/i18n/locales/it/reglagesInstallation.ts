import type fr from '../fr/reglagesInstallation'
import type { Structure } from '../../types'

/** Italien — espace « reglagesInstallation » (backlog § BK.2d), traduit depuis le français. */
const reglagesInstallation: Structure<typeof fr> = {
  titre: "Nascita dei nuclei",
  modeTitre: "Come nasce un nucleo?",
  modeIntro: "La modalità scelta vale per l'intera installazione.",
  modeFerme: "Chiuso",
  modeFermeAide: "Solo l'operatore crea un nucleo, generando un link «crea il tuo nucleo».",
  modeInvitation: "Su invito",
  modeInvitationAide: "Anche un proprietario può generare un link «crea il tuo nucleo» per una persona vicina. Tornare alla modalità chiusa spegne i link dei proprietari, non quelli dell'operatore.",
  ssoCreeSonFoyer: "Un nuovo account SSO crea il suo nucleo",
  ssoCreeSonFoyerAide: "Se disattivato, un nuovo account SSO viene creato senza nucleo e attende un invito.",
  compteSansFoyerCree: "Un account senza nucleo può crearne uno proprio",
  compteSansFoyerCreeAide: "Se disattivato, un account senza nucleo deve accettare un invito (o essere eliminato).",
}

export default reglagesInstallation
