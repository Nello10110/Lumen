import type fr from '../fr/liaisonSso'
import type { Structure } from '../../types'

/** Espagnol — espace « liaisonSso » (backlog § BK.2d), traduit depuis le français. */
const liaisonSso: Structure<typeof fr> = {
  titre: "Inicio de sesión SSO",
  lie: "Tu cuenta está vinculada a {fournisseur}: puedes entrar con esa identidad o con tu contraseña.",
  delierExplication: "Desvincular quita esa identidad de la cuenta: solo podrás entrar con tu contraseña.",
  delier: "Desvincular mi cuenta SSO",
  nonLie: "Tu cuenta no está vinculada a {fournisseur}.",
  lierExplication: "Vincúlala para entrar con tu identidad de {fournisseur}. Se te redirigirá al proveedor para autenticarte y volverás aquí para confirmar la vinculación.",
  lier: "Vincular mi cuenta SSO",
  sessionAbsente: "No había ninguna sesión abierta al volver del proveedor: la vinculación no se ha confirmado. Inicie sesión y vuelva a iniciarla desde Ajustes.",
  echec: "No se pudo vincular el SSO: {motif}",
  reussie: "Tu cuenta ya está vinculada a tu identidad SSO.",
  fermer: "Cerrar",
}

export default liaisonSso
