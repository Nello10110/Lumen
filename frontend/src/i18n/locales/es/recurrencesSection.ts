import type fr from '../fr/recurrencesSection'
import type { Structure } from '../../types'

/** Espagnol — espace « recurrencesSection » (backlog § BL.2), traduit depuis le français. */
const recurrencesSection: Structure<typeof fr> = {
  chargesRecurrentesEtAbonnements: "Gastos recurrentes y suscripciones",
  detecteAutomatiquementSurLes12: "Detectado automáticamente en los últimos 12 meses: movimientos que se repiten al menos dos veces con el mismo concepto, aún vistos en los últimos 45 días.",
  libelle: "Concepto",
  categorie: "Categoría",
  periodicite: "Periodicidad",
  occurrences: "Repeticiones",
  montant: "Importe",
  mensuelle: "Mensual",
  irreguliere: "Irregular",
  hausseDePrix: "Subida de precio",
}

export default recurrencesSection
