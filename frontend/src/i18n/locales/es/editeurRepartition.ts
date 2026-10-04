import type fr from '../fr/editeurRepartition'
import type { Structure } from '../../types'

/** Espagnol — espace « editeurRepartition » (backlog § BL.2), traduit depuis le français. */
const editeurRepartition: Structure<typeof fr> = {
  erreurMembres: "No se pueden cargar los miembros del hogar: {erreur}",
  proposition: "No hay ningún reparto guardado: esta es una propuesta a partes iguales. Solo se aplica una vez guardada.",
  divergente: "Las líneas de esta cuenta no tienen todas el mismo reparto. Al guardar aquí abajo, se sustituirán todas por este.",
  enregistrement: "Guardando...",
}

export default editeurRepartition
