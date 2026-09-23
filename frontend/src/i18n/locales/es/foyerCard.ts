import type fr from '../fr/foyerCard'
import type { Structure } from '../../types'

/** Espagnol — espace « foyerCard » (backlog § BL.2), traduit depuis le français. */
const foyerCard: Structure<typeof fr> = {
  nomEnregistre: "Nombre guardado.",
  monFoyer: "Mi hogar",
  leNomDuFoyerEst: "El nombre del hogar es visible para todas sus cuentas (propietario, miembros, invitados). Una vez definido, también sirve de frase de confirmación antes de un borrado completo de los datos.",
  nomDuFoyer: "Nombre del hogar",
  familleDupont: "Familia García",
  enregistrement: "Guardando…",
  enregistrer: "Guardar",
}

export default foyerCard
