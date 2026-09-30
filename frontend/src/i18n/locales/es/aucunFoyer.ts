import type fr from '../fr/aucunFoyer'
import type { Structure } from '../../types'

/** Espagnol — espace « aucunFoyer » (backlog § BK.2b), traduit depuis le français. */
const aucunFoyer: Structure<typeof fr> = {
  titre: "No pertenece a ningún hogar",
  connecteEn: "Sesión iniciada como {nom}.",
  explication: "Sin un hogar no hay datos que mostrar. Únase a uno con un enlace de invitación o cree el suyo si la instalación lo permite.",
  vosFoyers: "Sus hogares",
  ouvrir: "Abrir",
  rejoindreTitre: "Unirse a un hogar",
  lienLabel: "Enlace de invitación",
  lienAide: "Pegue el enlace recibido, o solo el código que sigue al «#».",
  lienIncomplet: "Este enlace no contiene un código de invitación. Péguelo completo, tal como se lo enviaron.",
  rejoindre: "Unirse al hogar",
  creerTitre: "Crear su propio hogar",
  nomFoyerLabel: "Nombre del hogar (opcional)",
  creer: "Crear mi hogar",
  supprimer: "Eliminar mi cuenta",
  supprimerTitre: "Eliminar mi cuenta",
  supprimerExplication: "Su cuenta, sus sesiones de conexión y su registro de accesos se borrarán definitivamente. Esta acción es irreversible.",
  confirmationLabel: "Para confirmar, escriba su nombre de usuario: {nom}",
  annuler: "Cancelar",
  supprimerConfirmer: "Eliminar definitivamente",
  deconnexion: "Cerrar sesión",
}

export default aucunFoyer
