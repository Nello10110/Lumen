import type fr from '../fr/comparaisonInseeCard'
import type { Structure } from '../../types'

/** Anglais — espace « comparaisonInseeCard » (backlog § BL.2), traduit depuis le français. */
const comparaisonInseeCard: Structure<typeof fr> = {
  comparaisonAuPatrimoineMedianFrancais: "Comparison with the French median wealth",
  votrePatrimoineBrut: "Your gross assets:",
  medianeFrancaisePourVotreTranche: ". French median for your age group (",
  ans: "years):",
  patrimoineBrutHorsEmpruntsDeduits: "Gross assets, loans not deducted. Source:",
  auDessus: "You are {ecart}% above this median.",
  enDessous: "You are {ecart}% below this median.",
}

export default comparaisonInseeCard
