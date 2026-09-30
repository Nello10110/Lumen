import type fr from '../fr/supprimerFoyer'
import type { Structure } from '../../types'

/** Espagnol — espace « supprimerFoyer » (backlog § BK.2c), traduit depuis le français. */
const supprimerFoyer: Structure<typeof fr> = {
  carteTitre: "Eliminar el hogar",
  carteExplication: "Elimina definitivamente el hogar en sí: su patrimonio, sus ajustes, sus enlaces para compartir y sus invitaciones. A diferencia del restablecimiento, el hogar deja de existir. No se elimina ninguna cuenta.",
  ouvrir: "Eliminar el hogar…",
  titre: "¿Eliminar el hogar?",
  efface: "Se borrarán definitivamente",
  aucunPatrimoine: "Ningún dato de patrimonio.",
  liensPartage: { one: "{n} enlace para compartir", other: "{n} enlaces para compartir" },
  invitations: { one: "{n} invitación", other: "{n} invitaciones" },
  comptesTitre: "Las cuentas del hogar",
  comptesConserves: { one: "El hogar tiene {n} cuenta (la suya incluida). No se elimina ninguna.", other: "El hogar tiene {n} cuentas (la suya incluida). No se elimina ninguna." },
  sansFoyer: { one: "{n} cuenta se quedará sin hogar: podrá unirse a un hogar con una invitación o crear el suyo.", other: "{n} cuentas se quedarán sin hogar: podrán unirse a un hogar con una invitación o crear el suyo." },
  gardentUnFoyer: { one: "{n} cuenta pertenece también a otro hogar, que conserva.", other: "{n} cuentas pertenecen también a otro hogar, que conservan." },
  apres: "Después, accederá a otro de sus hogares si tiene alguno; si no, a la pantalla «ningún hogar».",
  exportTitre: "Exporte antes sus datos",
  exportExplication: "El archivo de exportación es la única forma de conservar este patrimonio: se podrá importar en otro hogar. El hogar eliminado puede permanecer en las copias de seguridad cifradas del servidor hasta que se renueven.",
  exporter: "Exportar mis datos (JSON)",
  exportFait: "Exportación descargada.",
  irreversible: "Esta acción es irreversible.",
  confirmationLabel: "Para confirmar, escriba exactamente «{phrase}» a continuación",
  confirmationAria: "Confirmación de la eliminación del hogar",
  annuler: "Cancelar",
  supprimer: "Eliminar el hogar definitivamente",
  suppressionEnCours: "Eliminando…",
}

export default supprimerFoyer
