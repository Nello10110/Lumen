import type fr from '../fr/recurrencesSection'
import type { Structure } from '../../types'

/** Espagnol — espace « recurrencesSection » (backlog § BL.2), traduit depuis le français. */
const recurrencesSection: Structure<typeof fr> = {
  chargesRecurrentesEtAbonnements: "Gastos recurrentes y suscripciones",
  detecteAutomatiquement: "Detectado automáticamente a partir del historial importado: movimientos que se repiten al menos dos veces con el mismo concepto (se ignoran las fechas que el banco añade a los pagos con tarjeta), con ritmo mensual, trimestral o anual, y aún vigentes. El coste anual se estima a partir del importe actual.",
  libelle: "Concepto",
  categorie: "Categoría",
  periodicite: "Periodicidad",
  occurrences: "Repeticiones",
  montant: "Importe",
  mensuelle: "Mensual",
  trimestrielle: "Trimestral",
  annuelle: "Anual",
  hausseDePrix: "Subida de precio",
  evolutionDepuis: "{pct} desde {montant}",
  coutAnnuelEstime: "Coste anual estimado",
  achatsFrequents: "Compras frecuentes",
  achatsFrequentsAide: "Comercios o transferencias que se repiten sin un ritmo regular: no se cuentan como gastos recurrentes.",
  totalObserve: "Total del período observado",
  totalAbonnements: "Suscripciones y domiciliaciones: {annuel}/año · {mensuel}/mes",
}

export default recurrencesSection
