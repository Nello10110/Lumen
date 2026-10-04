import type fr from '../fr/editeurRepartition'
import type { Structure } from '../../types'

/** Allemand — espace « editeurRepartition » (backlog § BL.2), traduit depuis le français. */
const editeurRepartition: Structure<typeof fr> = {
  erreurMembres: "Haushaltsmitglieder konnten nicht geladen werden: {erreur}",
  proposition: "Es ist keine Aufteilung gespeichert: Hier ein Vorschlag zu gleichen Teilen. Er gilt erst, wenn du ihn speicherst.",
  divergente: "Die Zeilen dieses Kontos haben nicht alle dieselbe Aufteilung. Wenn du unten speicherst, werden alle durch diese ersetzt.",
  enregistrement: "Wird gespeichert...",
}

export default editeurRepartition
