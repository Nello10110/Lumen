import type fr from '../fr/detenteursCard'
import type { Structure } from '../../types'

/** Espagnol — espace « detenteursCard » (backlog § BL.2), traduit depuis le français. */
const detenteursCard: Structure<typeof fr> = {
  personnes: "Personas",
  declareesUneFoisReutiliseesPour: "Declaradas una vez, reutilizadas para repartir la propiedad de los activos y préstamos (cuotas, desde la ficha detallada de cada posición) y filtrar el patrimonio por titular (barra de controles, arriba de la pantalla).",
  aucunDetenteurDeclare: "Ningún titular declarado.",
  supprimer: "Eliminar",
  nom: "Nombre",
  alice: "Alicia",
  ajouter: "Añadir",
}

export default detenteursCard
