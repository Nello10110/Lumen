import type fr from '../fr/epargneApercu'
import type { Structure } from '../../types'

/** Allemand — espace « epargneApercu » (backlog § BL.2), traduit depuis le français. */
const epargneApercu: Structure<typeof fr> = {
  valeurActuelle: "Aktueller Wert",
  aJourAu: "Stand",
  versementMensuelDeclare: "Erfasste monatliche Einzahlung",
  additionneAuPreremplissageDuSimulateur: "zur Vorbelegung des Simulators addiert",
  ajouterUneValorisation: "Bewertung hinzufügen",
  unPointAntidateRattrapageA: "Ein rückdatierter Punkt (nachträgliche Erfassung) ersetzt nie den aktuellen Wert, wenn bereits ein neueres Datum bekannt ist.",
}

export default epargneApercu
