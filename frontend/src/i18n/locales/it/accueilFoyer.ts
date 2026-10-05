import type fr from '../fr/accueilFoyer'
import type { Structure } from '../../types'

/** Italien — espace « accueilFoyer » (backlog § BK.2b), traduit depuis le français. */
const accueilFoyer: Structure<typeof fr> = {
  titre: "Benvenuto nel nucleo {foyer}",
  titreSansNom: "Benvenuto nel Suo nuovo nucleo",
  votreRole: "Il Suo ruolo in questo nucleo: {role}.",
  descriptionMembre: "Può consultare e inserire le attività, i prestiti e le transazioni del nucleo.",
  descriptionInvite: "Consulta, in sola lettura, il patrimonio dei membri del nucleo che Le sono stati affidati.",
  ouvrir: "Apri l'app",
}

export default accueilFoyer
