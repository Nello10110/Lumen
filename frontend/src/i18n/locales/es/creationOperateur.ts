import type fr from '../fr/creationOperateur'
import type { Structure } from '../../types'

/** Espagnol — espace « creationOperateur » (backlog § BK.2d), traduit depuis le français. */
const creationOperateur: Structure<typeof fr> = {
  creer: "Crear la cuenta de operador",
  creeTitre: "Cuenta de operador «{nom}» creada.",
  creeExplication: "Esta cuenta es distinta de la tuya: no pertenece a ningún hogar y no ve ningún patrimonio. Para administrar la instalación (hogares, tareas programadas, logotipo del botón SSO), cierra sesión y entra con ella. Los ajustes de instalación ya no aparecen en tu pantalla de Ajustes.",
}

export default creationOperateur
