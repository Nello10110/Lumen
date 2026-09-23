import type fr from '../fr/lignesPatrimoineTable'
import type { Structure } from '../../types'

/** Italien — espace « lignesPatrimoineTable » (backlog § BL.2), traduit depuis le français. */
const lignesPatrimoineTable: Structure<typeof fr> = {
  aucuneLignePourCetteCombinaison: "Nessuna riga per questa combinazione di filtri.",
  ligne: "Riga",
  classe: "Classe",
  compte: "Conto",
  quantite: "Quantità",
  quotePart: "Quota",
  valeur: "Valore",
  valeurNette: "Valore netto",
  sansCompte: "Senza conto",
  total: "Totale",
}

export default lignesPatrimoineTable
