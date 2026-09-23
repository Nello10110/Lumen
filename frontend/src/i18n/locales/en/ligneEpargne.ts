import type fr from '../fr/ligneEpargne'
import type { Structure } from '../../types'

/** Anglais — espace « ligneEpargne » (backlog § BL.2), traduit depuis le français. */
const ligneEpargne: Structure<typeof fr> = {
  nomDuCompte: "Account name",
  versementMensuel: "Monthly contribution (€)",
  optionnel: "optional",
  enregistrement: "Saving...",
  enregistrer: "Save",
  annuler: "Cancel",
  fermer: "Close",
  modifier: "Edit",
  ajouterUneValorisation: "Add a valuation",
  supprimer: "Delete",
  valeurActuelle: "Current value",
  au: "as of",
  versementMensuel2: "Monthly contribution",
  supprimerCetteLigne: "Delete this line?",
  etToutSonHistoriqueDe: "and its whole valuation history will be permanently deleted.",
  suppression: "Deleting...",
}

export default ligneEpargne
