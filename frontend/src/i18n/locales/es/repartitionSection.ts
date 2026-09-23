import type fr from '../fr/repartitionSection'
import type { Structure } from '../../types'

/** Espagnol — espace « repartitionSection » (backlog § BL.2), traduit depuis le français. */
const repartitionSection: Structure<typeof fr> = {
  montantMensuelVisePourCette: "Importe mensual previsto para esta categoría. Vacíe el campo para quitar el objetivo.",
  repartitionDesSorties: "Reparto de las salidas",
  aucuneSortieSurCettePeriode: "Ninguna salida en este periodo.",
  categorie: "Categoría",
  montant: "Importe",
  budgetCible: "Presupuesto objetivo",
  ecart: "Diferencia",
}

export default repartitionSection
