import type fr from '../fr/comparaisonInseeCard'
import type { Structure } from '../../types'

/** Italien — espace « comparaisonInseeCard » (backlog § BL.2), traduit depuis le français. */
const comparaisonInseeCard: Structure<typeof fr> = {
  comparaisonAuPatrimoineMedianFrancais: "Confronto con il patrimonio mediano francese",
  votrePatrimoineBrut: "Il Suo patrimonio lordo:",
  medianeFrancaisePourVotreTranche: ". Mediana francese per la Sua fascia d’età (",
  ans: "anni):",
  patrimoineBrutHorsEmpruntsDeduits: "Patrimonio lordo, senza dedurre i prestiti. Fonte:",
  auDessus: "È il {ecart}% sopra questa mediana.",
  enDessous: "È il {ecart}% sotto questa mediana.",
}

export default comparaisonInseeCard
