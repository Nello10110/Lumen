import type fr from '../fr/accueilFoyer'
import type { Structure } from '../../types'

/** Anglais — espace « accueilFoyer » (backlog § BK.2b), traduit depuis le français. */
const accueilFoyer: Structure<typeof fr> = {
  titre: "Welcome to the {foyer} household",
  titreSansNom: "Welcome to your new household",
  votreRole: "Your role in this household: {role}.",
  descriptionMembre: "You can view and enter the household's assets, loans and transactions.",
  descriptionInvite: "You view, read-only, the assets of the household members entrusted to you.",
  ouvrir: "Open the app",
}

export default accueilFoyer
