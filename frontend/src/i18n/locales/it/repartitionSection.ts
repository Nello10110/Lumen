import type fr from '../fr/repartitionSection'
import type { Structure } from '../../types'

/** Italien — espace « repartitionSection » (backlog § BL.2), traduit depuis le français. */
const repartitionSection: Structure<typeof fr> = {
  montantMensuelVisePourCette: "Importo mensile previsto per questa categoria. Svuoti il campo per rimuovere l’obiettivo.",
  repartitionDesSorties: "Ripartizione delle uscite",
  aucuneSortieSurCettePeriode: "Nessuna uscita in questo periodo.",
  categorie: "Categoria",
  montant: "Importo",
  budgetCible: "Budget obiettivo",
  ecart: "Differenza",
}

export default repartitionSection
