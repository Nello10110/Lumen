import type fr from '../fr/repartitionSection'
import type { Structure } from '../../types'

/** Anglais — espace « repartitionSection » (backlog § BL.2), traduit depuis le français. */
const repartitionSection: Structure<typeof fr> = {
  montantMensuelVisePourCette: "Monthly amount targeted for this category. Clear the field to remove the target.",
  repartitionDesSorties: "Breakdown of outflows",
  aucuneSortieSurCettePeriode: "No outflow over this period.",
  categorie: "Category",
  montant: "Amount",
  budgetCible: "Target budget",
  ecart: "Difference",
}

export default repartitionSection
