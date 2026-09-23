import type fr from '../fr/epargneApercu'
import type { Structure } from '../../types'

/** Anglais — espace « epargneApercu » (backlog § BL.2), traduit depuis le français. */
const epargneApercu: Structure<typeof fr> = {
  valeurActuelle: "Current value",
  aJourAu: "up to date as of",
  versementMensuelDeclare: "Declared monthly contribution",
  additionneAuPreremplissageDuSimulateur: "added to the Simulator’s pre-fill",
  ajouterUneValorisation: "Add a valuation",
  unPointAntidateRattrapageA: "A backdated point (catching up afterwards) never replaces the current value if a more recent date is already known.",
}

export default epargneApercu
