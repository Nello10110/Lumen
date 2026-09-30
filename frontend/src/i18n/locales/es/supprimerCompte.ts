import type fr from '../fr/supprimerCompte'
import type { Structure } from '../../types'

/** Espagnol — espace « supprimerCompte » (backlog § BK.2c), traduit depuis le français. */
const supprimerCompte: Structure<typeof fr> = {
  menu: "Eliminar mi cuenta",
  titre: "¿Eliminar mi cuenta?",
  explication: "Su cuenta, sus sesiones de conexión y su registro de accesos se borrarán definitivamente.",
  foyersSupprimes: { one: "Este hogar se eliminará con su cuenta, con todos sus datos: usted es su único miembro.", other: "Estos {n} hogares se eliminarán con su cuenta, con todos sus datos: usted es su único miembro." },
  foyersQuittes: { one: "Saldrá de este hogar, cuyos datos se quedan con sus demás miembros:", other: "Saldrá de estos {n} hogares, cuyos datos se quedan con sus demás miembros:" },
  irreversible: "Esta acción es irreversible.",
  confirmationLabel: "Para confirmar, escriba su nombre de usuario: {nom}",
  annuler: "Cancelar",
  fermer: "Cerrar",
  supprimer: "Eliminar definitivamente",
  bloqueIntro: { one: "Por ahora no puede eliminar su cuenta: es propietario de un hogar que tiene otras cuentas.", other: "Por ahora no puede eliminar su cuenta: es propietario de {n} hogares que tienen otras cuentas." },
  autresComptes: { one: "{n} otra cuenta", other: "{n} otras cuentas" },
  bloqueSolution: "Para continuar, abra ese hogar (selector de hogar) y transfiera su propiedad en Ajustes → Cuentas y seguridad, o elimínelo en Ajustes → General.",
}

export default supprimerCompte
