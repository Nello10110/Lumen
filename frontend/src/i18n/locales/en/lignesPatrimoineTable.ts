import type fr from '../fr/lignesPatrimoineTable'
import type { Structure } from '../../types'

/** Anglais — espace « lignesPatrimoineTable » (backlog § BL.2), traduit depuis le français. */
const lignesPatrimoineTable: Structure<typeof fr> = {
  aucuneLignePourCetteCombinaison: "No line for this combination of filters.",
  ligne: "Line",
  classe: "Class",
  compte: "Account",
  quantite: "Quantity",
  quotePart: "Share",
  valeur: "Value",
  valeurNette: "Net value",
  sansCompte: "No account",
  total: "Total",
}

export default lignesPatrimoineTable
