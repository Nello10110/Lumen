import type fr from '../fr/mouvementsSection'
import type { Structure } from '../../types'

/** Italien — espace « mouvementsSection » (backlog § BL.2), traduit depuis le français. */
const mouvementsSection: Structure<typeof fr> = {
  toutesCategories: "Tutte le categorie",
  nonCategorise: "Non classificato",
  tousLesComptes: "Tutti i conti",
  mouvements: "Movimenti",
  aucunMouvementSurCettePeriode: "Nessun movimento in questo periodo.",
  importeUnReleveBancaireDepuis: "Importa un estratto bancario dalla schermata Importa.",
  aucunMouvementNeCorrespondA: "Nessun movimento corrisponde a questo filtro.",
  date: "Data",
  libelle: "Descrizione",
  montant: "Importo",
  categorie: "Categoria",
}

export default mouvementsSection
