import type fr from '../fr/detenteursCard'
import type { Structure } from '../../types'

/** Espagnol — espace « detenteursCard » (backlog § BL.2), traduit depuis le français. */
const detenteursCard: Structure<typeof fr> = {
  personnes: "Miembros del hogar",
  distinctionAcces: "Las personas cuyo patrimonio se sigue. No debe confundirse con los accesos (las cuentas que se conectan), que se gestionan en la pestaña Cuentas y seguridad.",
  declareesUneFoisReutiliseesPour: "Declaradas una vez, reutilizadas para repartir la propiedad de los activos y préstamos (partes, desde la ficha detallada de cada posición) y filtrar el patrimonio por miembro del hogar (barra de controles, arriba de la pantalla).",
  aucunDetenteurDeclare: "Ningún miembro del hogar declarado.",
  supprimer: "Eliminar",
  nom: "Nombre",
  alice: "Alicia",
  ajouter: "Añadir",
}

export default detenteursCard
