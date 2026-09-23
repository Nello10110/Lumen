import type fr from '../fr/budgetPage'
import type { Structure } from '../../types'

/** Espagnol — espace « budgetPage » (backlog § BL.2), traduit depuis le français. */
const budgetPage: Structure<typeof fr> = {
  nonDepense: "No gastado",
  budget: "Presupuesto",
  periode: "Periodo",
  au: "al",
  laDateDeFinDoit: "La fecha de fin debe ser igual o posterior a la de inicio.",
  aucunMouvementBancaireImportePour: "Ningún movimiento bancario importado para este periodo.",
  importeUnReleveCsvOfx: "Importa un extracto (CSV, OFX o QIF) desde la pantalla Importar.",
  disponibleSurLaPeriode: "Disponible en el periodo",
  dEntrees: "de entradas −",
  deSorties: "de salidas",
  depensesRecurrentesMois: "Gastos recurrentes / mes",
  estimeSurLes3Derniers: "estimado en los últimos 3 meses",
  tauxDEpargneReel: "Tasa de ahorro real",
  sortiesCategorieEpargneEntrees: "salidas de la categoría «Ahorro» / entradas",
  resteAVivre: "Resto para vivir",
  entreesLogementChargesRecurrentes: "entradas − vivienda − gastos recurrentes",
  tauxDEpargneIndisponibleCree: "Tasa de ahorro no disponible: crea o renombra una categoría «Ahorro» abajo. ",
  resteAVivreIndisponibleCree: "Resto para vivir no disponible: crea o renombra una categoría «Vivienda» abajo.",
  modeMensuel: "Mensual",
  modeAnnuel: "Anual",
  modePersonnalise: "Personalizado",
}

export default budgetPage
