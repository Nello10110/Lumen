import type fr from '../fr/quitterFoyer'
import type { Structure } from '../../types'

/** Espagnol — espace « quitterFoyer » (backlog § BK.2b), traduit depuis le français. */
const quitterFoyer: Structure<typeof fr> = {
  menu: "Salir de este hogar",
  titre: "¿Salir de este hogar?",
  explication: "Ya no tendrá acceso a sus datos, que se quedan en el hogar. Para volver a unirse, su propietario tendrá que enviarle una nueva invitación.",
  dernierFoyer: "Es su último hogar: no tendrá acceso a ningún dato hasta que se una a otro hogar con una invitación o cree el suyo. Su cuenta no se elimina.",
  annuler: "Cancelar",
  confirmer: "Salir del hogar",
}

export default quitterFoyer
