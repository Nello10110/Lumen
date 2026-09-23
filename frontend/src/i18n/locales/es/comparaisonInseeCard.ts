import type fr from '../fr/comparaisonInseeCard'
import type { Structure } from '../../types'

/** Espagnol — espace « comparaisonInseeCard » (backlog § BL.2), traduit depuis le français. */
const comparaisonInseeCard: Structure<typeof fr> = {
  comparaisonAuPatrimoineMedianFrancais: "Comparación con el patrimonio mediano francés",
  votrePatrimoineBrut: "Su patrimonio bruto:",
  medianeFrancaisePourVotreTranche: ". Mediana francesa para su franja de edad (",
  ans: "años):",
  patrimoineBrutHorsEmpruntsDeduits: "Patrimonio bruto, sin descontar préstamos. Fuente:",
  auDessus: "Está un {ecart} % por encima de esta mediana.",
  enDessous: "Está un {ecart} % por debajo de esta mediana.",
}

export default comparaisonInseeCard
