import type fr from '../fr/invitationPage'
import type { Structure } from '../../types'

/** Espagnol — espace « invitationPage » (backlog § BK.2b), traduit depuis le français. */
const invitationPage: Structure<typeof fr> = {
  titre: "Invitación para unirse a un hogar",
  lienInvalide: "Este enlace de invitación no es válido, ha caducado o ya se ha usado. Pida un nuevo enlace a la persona que le invitó.",
  retourAccueil: "Volver a la aplicación",
  inviteAvecNom: "{foyer} le invita a unirse a su hogar. Rol propuesto: {role}.",
  inviteSansNom: "Está invitado a unirse a un hogar. Rol propuesto: {role}.",
  pour: "Invitación destinada a: {libelle}",
  nomUtilisateur: "Nombre de usuario",
  motDePasse: "Contraseña",
  huitCaracteres: "Mínimo 8 caracteres",
  confirmation: "Confirmar la contraseña",
  motsDePasseDifferents: "Las dos contraseñas no coinciden.",
  creerEtRejoindre: "Crear mi cuenta y unirme al hogar",
  seConnecterEtRejoindre: "Iniciar sesión y unirme al hogar",
  unInstant: "Un momento...",
  ou: "o",
  continuerAvec: "Continuar con {fournisseur}",
  dejaUnCompte: "Ya tengo una cuenta",
  pasDeCompte: "Todavía no tengo cuenta",
  connecteEn: "Ha iniciado sesión como {nom}.",
  ajouteAuxFoyers: "Este hogar se añadirá a los que ya tenga esta cuenta, si los hay: la barra lateral permitirá cambiar de uno a otro.",
  rejoindre: "Unirme a este hogar",
  autreCompte: "Usar otra cuenta",
  ouvrirApplication: "Abrir la aplicación sin unirme",
  titreCreation: "Invitación para crear su hogar",
  inviteCreation: "Está invitado a crear su hogar: usted será su propietario.",
  creerLeFoyer: "Crear mi hogar",
  ajouteAuxFoyersCreation: "Su nuevo hogar se añadirá a los que ya tenga esta cuenta, si los hay: la barra lateral permitirá cambiar de uno a otro.",
  creerEtCreerFoyer: "Crear mi cuenta y mi hogar",
  seConnecterEtCreerFoyer: "Iniciar sesión y crear mi hogar",
}

export default invitationPage
