import type fr from '../fr/accueilFoyer'
import type { Structure } from '../../types'

/** Espagnol — espace « accueilFoyer » (backlog § BK.2b), traduit depuis le français. */
const accueilFoyer: Structure<typeof fr> = {
  titre: "Bienvenido al hogar {foyer}",
  titreSansNom: "Bienvenido a su nuevo hogar",
  votreRole: "Su rol en este hogar: {role}.",
  descriptionMembre: "Puede consultar e introducir los activos, préstamos y transacciones del hogar.",
  descriptionInvite: "Consulta, en modo lectura, el patrimonio de los miembros del hogar que se le han confiado.",
  ouvrir: "Abrir la aplicación",
}

export default accueilFoyer
