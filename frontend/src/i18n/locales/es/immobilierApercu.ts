import type fr from '../fr/immobilierApercu'
import type { Structure } from '../../types'

/** Espagnol — espace « immobilierApercu » (backlog § BL.2), traduit depuis le français. */
const immobilierApercu: Structure<typeof fr> = {
  cashflowEtRentabilite: "Flujo de caja y rentabilidad",
  cashflowMensuel: "Flujo de caja mensual",
  loyerChargesFrais12Mensualite: "alquiler − gastos − costes/12 − cuota",
  rentabiliteBrute: "Rentabilidad bruta",
  loyerAnnuelPrixDAcquisition: "alquiler anual / precio total de adquisición",
  rentabiliteNette: "Rentabilidad neta",
  loyerChargesFraisPrixD: "(alquiler − gastos − costes) / precio total de adquisición",
  prixAuM: "Precio por m²",
  mensualiteDeLEmpruntRattache: "Cuota del préstamo vinculado",
  prixDAcquisitionTotal: "Precio total de adquisición",
  prixDAchatFraisNotaire: "precio de compra + gastos (notario, obras...)",
}

export default immobilierApercu
