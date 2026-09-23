import type fr from '../fr/comparaisonInseeCard'
import type { Structure } from '../../types'

/** Allemand — espace « comparaisonInseeCard » (backlog § BL.2), traduit depuis le français. */
const comparaisonInseeCard: Structure<typeof fr> = {
  comparaisonAuPatrimoineMedianFrancais: "Vergleich mit dem französischen Medianvermögen",
  votrePatrimoineBrut: "Ihr Bruttovermögen:",
  medianeFrancaisePourVotreTranche: ". Französischer Median für Ihre Altersgruppe (",
  ans: "Jahre):",
  patrimoineBrutHorsEmpruntsDeduits: "Bruttovermögen, ohne Abzug von Krediten. Quelle:",
  auDessus: "Sie liegen {ecart} % über diesem Median.",
  enDessous: "Sie liegen {ecart} % unter diesem Median.",
}

export default comparaisonInseeCard
