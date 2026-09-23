import type fr from '../fr/portefeuillePage'
import type { Structure } from '../../types'

/** Anglais — espace « portefeuillePage » (backlog § BL.2), traduit depuis le français. */
const portefeuillePage: Structure<typeof fr> = {
  filtrerParCategorie: "Filter by category",
  filtrerParCompte: "Filter by account",
  tousLesComptes: "All accounts",
  sansCompte: "No account",
  rafraichissement: "Refreshing...",
  portefeuille: "Portfolio",
  coursAJourAu: "prices up to date as of",
  rallumerLesCours: "Refresh prices.",
  rafraichir: "Refresh",
  ajouterUneLigne: "Add a line",
  unePositionBoursiereUnBien: "A stock position, an asset valued by hand (real estate, savings, vehicle), or a loan.",
  fermer: "Close",
  filtrer: "Filter",
  filtrerLePortefeuille: "Filter the portfolio",
  ajoutezVotrePremiereLignePour: "Add your first line to light up your wealth.",
  aucunePositionNeCorrespondA: "No position matches this filter.",
  reinitialiserLesFiltres: "Reset filters",
  performanceDesLignesAffichees: "Performance of the lines shown",
  supprimerCetteLigne: "Delete this line?",
  laLigne: "The line",
  seraDefinitivementSupprimeeDuPortefeuille: "will be permanently removed from the portfolio.",
  annuler: "Cancel",
  suppression: "Deleting...",
  supprimer: "Delete",
  rafraichissementProgression: "Refreshing... ({faites} / {total} positions)",
  nLignes: { one: "{n} line", other: "{n} lines" },
  tous: "All",
  voirNPositions: { one: "See {n} position", other: "See {n} positions" },
}

export default portefeuillePage
