import type fr from '../fr/gestionFoyerCard'
import type { Structure } from '../../types'

/** Espagnol — espace « gestionFoyerCard » (backlog § BL.2), traduit depuis le français. */
const gestionFoyerCard: Structure<typeof fr> = {
  comptesDuFoyer: "Cuentas del hogar",
  unMembrePeutConsulterEt: "Un miembro puede consultar e introducir activos/préstamos/transacciones del hogar, pero no los indicadores de situación ni la seguridad. Un invitado solo ve, en modo lectura, el patrimonio neto y la cartera de los titulares que se le asignan abajo.",
  aucunCompteAAfficher: "Ninguna cuenta que mostrar.",
  ajouteUnMembreOuUn: "Añade un miembro o un invitado con el formulario de abajo.",
  enregistrer: "Guardar",
  annuler: "Cancelar",
  modifier: "Modificar",
  vous: "(usted)",
  compteMotDePasseLocal: "Cuenta con contraseña local",
  connexionLocale: "Inicio de sesión local",
  jamaisConnecte: "Nunca conectado",
  tropDeTentativesDeConnexion: "Demasiados intentos de conexión fallidos recientes",
  verrouilleJusquA: "Bloqueado hasta",
  role: "Rol",
  supprimer: "Eliminar",
  nomDUtilisateur: "Nombre de usuario",
  motDePasse: "Contraseña",
  membreDuFoyer: "Miembro del hogar",
  invite: "Invitado",
  ajouter: "Añadir",
  aucunDetenteurDeclare: "Ningún titular declarado.",
  roleProprietaire: "Propietario",
  roleMembre: "Miembro del hogar",
  roleInvite: "Invitado",
  ariaNomUtilisateurEdition: "Nombre de usuario de {nom} (edición)",
  ariaModifierNomUtilisateur: "Modificar el nombre de usuario de {nom}",
  compteLieVia: "Cuenta aprovisionada/vinculada mediante {fournisseur}",
  connexionSso: "Inicio de sesión SSO ({fournisseur})",
  derniereConnexion: "Última conexión {date}",
  sessionsActives: { one: "{n} sesión activa", other: "{n} sesiones activas" },
  ariaRole: "Rol de {nom}",
  ariaSupprimerCompte: "Eliminar la cuenta {nom}",
}

export default gestionFoyerCard
