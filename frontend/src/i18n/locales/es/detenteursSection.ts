import type fr from '../fr/detenteursSection'
import type { Structure } from '../../types'

/** Espagnol — espace « detenteursSection » (backlog § BL.2), traduit depuis le français. */
const detenteursSection: Structure<typeof fr> = {
  detenteurs: "Miembros del hogar",
  introduction: "Reparte esta línea entre los miembros del hogar. La suma debe ser 100 %; si todo está a 0 %, la línea sigue perteneciendo a todo el hogar.",
  cetteLigneAppartientAuCompte: "Esta línea pertenece a la cuenta",
  definisLaPlutotUneSeule: "— mejor defínelo una sola vez para toda la cuenta desde su ficha, si las demás líneas de la cuenta deben tener el mismo reparto.",
  enregistrer: "Guardar el reparto",
  repartitionEnregistree: "Reparto guardado.",
  aucunMembre: "Todavía no hay ningún miembro del hogar declarado: esta línea pertenece a todo el hogar. Añade un miembro para repartirla.",
  ajouterUnMembre: "Añadir un miembro del hogar",
}

export default detenteursSection
