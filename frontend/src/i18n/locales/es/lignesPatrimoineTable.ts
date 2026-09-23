import type fr from '../fr/lignesPatrimoineTable'
import type { Structure } from '../../types'

/** Espagnol — espace « lignesPatrimoineTable » (backlog § BL.2), traduit depuis le français. */
const lignesPatrimoineTable: Structure<typeof fr> = {
  aucuneLignePourCetteCombinaison: "Ninguna línea para esta combinación de filtros.",
  ligne: "Línea",
  classe: "Clase",
  compte: "Cuenta",
  quantite: "Cantidad",
  quotePart: "Cuota",
  valeur: "Valor",
  valeurNette: "Valor neto",
  sansCompte: "Sin cuenta",
  total: "Total",
}

export default lignesPatrimoineTable
