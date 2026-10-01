import type fr from '../fr/comptesSansFoyer'
import type { Structure } from '../../types'

/** Espagnol — espace « comptesSansFoyer » (backlog § BK.2d), traduit depuis le français. */
const comptesSansFoyer: Structure<typeof fr> = {
  titre: "Cuentas sin hogar",
  intro: "Cuentas que inician sesión pero no pertenecen a ningún hogar: eliminar o abandonar su último hogar las deja aquí. Una cuenta se elimina a sí misma; mientras no tenga hogar, puedes hacerlo por ella.",
  aucun: "Ninguna cuenta sin hogar.",
  creeLe: "Creada el {date}",
  derniereConnexion: "último acceso {date}",
  jamaisConnecte: "nunca ha iniciado sesión",
  supprimer: "Eliminar",
  supprimerAria: "Eliminar la cuenta {nom}",
  supprimerTitre: "¿Eliminar la cuenta {nom}?",
  supprimerExplication: "La cuenta, sus sesiones y su registro de accesos se borrarán definitivamente.",
  supprimerDefinitivement: "Eliminar definitivamente la cuenta",
}

export default comptesSansFoyer
