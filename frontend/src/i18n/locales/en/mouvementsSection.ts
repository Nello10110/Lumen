import type fr from '../fr/mouvementsSection'
import type { Structure } from '../../types'

/** Anglais — espace « mouvementsSection » (backlog § BL.2), traduit depuis le français. */
const mouvementsSection: Structure<typeof fr> = {
  toutesCategories: "All categories",
  nonCategorise: "Uncategorized",
  tousLesComptes: "All accounts",
  mouvements: "Transactions",
  aucunMouvementSurCettePeriode: "No transaction over this period.",
  importeUnReleveBancaireDepuis: "Import a bank statement from the Import screen.",
  aucunMouvementNeCorrespondA: "No transaction matches this filter.",
  date: "Date",
  libelle: "Description",
  montant: "Amount",
  categorie: "Category",
}

export default mouvementsSection
