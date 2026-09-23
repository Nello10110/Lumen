import type fr from '../fr/immobilierApercu'
import type { Structure } from '../../types'

/** Anglais — espace « immobilierApercu » (backlog § BL.2), traduit depuis le français. */
const immobilierApercu: Structure<typeof fr> = {
  cashflowEtRentabilite: "Cash flow and yield",
  cashflowMensuel: "Monthly cash flow",
  loyerChargesFrais12Mensualite: "rent − charges − fees/12 − loan payment",
  rentabiliteBrute: "Gross yield",
  loyerAnnuelPrixDAcquisition: "annual rent / total acquisition price",
  rentabiliteNette: "Net yield",
  loyerChargesFraisPrixD: "(rent − charges − fees) / total acquisition price",
  prixAuM: "Price per m²",
  mensualiteDeLEmpruntRattache: "Payment of the linked loan",
  prixDAcquisitionTotal: "Total acquisition price",
  prixDAchatFraisNotaire: "purchase price + costs (notary, works...)",
}

export default immobilierApercu
