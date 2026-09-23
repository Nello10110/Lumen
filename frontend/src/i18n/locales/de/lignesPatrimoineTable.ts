import type fr from '../fr/lignesPatrimoineTable'
import type { Structure } from '../../types'

/** Allemand — espace « lignesPatrimoineTable » (backlog § BL.2), traduit depuis le français. */
const lignesPatrimoineTable: Structure<typeof fr> = {
  aucuneLignePourCetteCombinaison: "Keine Zeile für diese Filterkombination.",
  ligne: "Zeile",
  classe: "Klasse",
  compte: "Konto",
  quantite: "Menge",
  quotePart: "Anteil",
  valeur: "Wert",
  valeurNette: "Nettowert",
  sansCompte: "Ohne Konto",
  total: "Summe",
}

export default lignesPatrimoineTable
