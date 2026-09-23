import type fr from '../fr/epargneApercu'
import type { Structure } from '../../types'

/** Italien — espace « epargneApercu » (backlog § BL.2), traduit depuis le français. */
const epargneApercu: Structure<typeof fr> = {
  valeurActuelle: "Valore attuale",
  aJourAu: "aggiornato al",
  versementMensuelDeclare: "Versamento mensile dichiarato",
  additionneAuPreremplissageDuSimulateur: "sommato al precompilato del Simulatore",
  ajouterUneValorisation: "Aggiungi una valutazione",
  unPointAntidateRattrapageA: "Un punto retrodatato (recupero a posteriori) non sostituisce mai il valore attuale se è già nota una data più recente.",
}

export default epargneApercu
