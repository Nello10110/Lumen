import type fr from '../fr/transfertPropriete'
import type { Structure } from '../../types'

/** Espagnol — espace « transfertPropriete » (backlog § BK.2c), traduit depuis le français. */
const transfertPropriete: Structure<typeof fr> = {
  titre: "Transferir la propiedad del hogar",
  explication: "El miembro que elijas pasa a ser propietario del hogar y tú pasas a ser un miembro más: ya no tendrás acceso a Ajustes ni a la gestión de miembros. Los datos se quedan en el hogar, no se mueve nada. Solo el nuevo propietario podrá devolverte la propiedad.",
  membreLabel: "Nuevo propietario",
  choisir: "Elegir un miembro…",
  confirmationLabel: "Para confirmar, escribe su nombre de usuario: {nom}",
  annuler: "Cancelar",
  confirmer: "Transferir la propiedad",
}

export default transfertPropriete
