import type fr from '../fr/ligneEpargne'
import type { Structure } from '../../types'

/** Espagnol — espace « ligneEpargne » (backlog § BL.2), traduit depuis le français. */
const ligneEpargne: Structure<typeof fr> = {
  nomDuCompte: "Nombre de la cuenta",
  versementMensuel: "Aportación mensual (€)",
  optionnel: "opcional",
  enregistrement: "Guardando...",
  enregistrer: "Guardar",
  annuler: "Cancelar",
  fermer: "Cerrar",
  modifier: "Modificar",
  ajouterUneValorisation: "Añadir una valoración",
  supprimer: "Eliminar",
  valeurActuelle: "Valor actual",
  au: "a",
  versementMensuel2: "Aportación mensual",
  supprimerCetteLigne: "¿Eliminar esta línea?",
  etToutSonHistoriqueDe: "y todo su historial de valoración se eliminarán definitivamente.",
  suppression: "Eliminando...",
}

export default ligneEpargne
