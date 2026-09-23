import type fr from '../fr/mouvementsSection'
import type { Structure } from '../../types'

/** Espagnol — espace « mouvementsSection » (backlog § BL.2), traduit depuis le français. */
const mouvementsSection: Structure<typeof fr> = {
  toutesCategories: "Todas las categorías",
  nonCategorise: "Sin categorizar",
  tousLesComptes: "Todas las cuentas",
  mouvements: "Movimientos",
  aucunMouvementSurCettePeriode: "Ningún movimiento en este periodo.",
  importeUnReleveBancaireDepuis: "Importa un extracto bancario desde la pantalla Importar.",
  aucunMouvementNeCorrespondA: "Ningún movimiento coincide con este filtro.",
  date: "Fecha",
  libelle: "Concepto",
  montant: "Importe",
  categorie: "Categoría",
}

export default mouvementsSection
