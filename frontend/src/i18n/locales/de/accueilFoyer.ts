import type fr from '../fr/accueilFoyer'
import type { Structure } from '../../types'

/** Allemand — espace « accueilFoyer » (backlog § BK.2b), traduit depuis le français. */
const accueilFoyer: Structure<typeof fr> = {
  titre: "Willkommen im Haushalt {foyer}",
  titreSansNom: "Willkommen in Ihrem neuen Haushalt",
  votreRole: "Ihre Rolle in diesem Haushalt: {role}.",
  descriptionMembre: "Sie können die Vermögenswerte, Kredite und Transaktionen des Haushalts einsehen und erfassen.",
  descriptionInvite: "Sie sehen, nur lesend, das Vermögen der Personen, die Ihnen anvertraut wurden.",
  ouvrir: "App öffnen",
}

export default accueilFoyer
