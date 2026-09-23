import type fr from '../fr/immobilierApercu'
import type { Structure } from '../../types'

/** Italien — espace « immobilierApercu » (backlog § BL.2), traduit depuis le français. */
const immobilierApercu: Structure<typeof fr> = {
  cashflowEtRentabilite: "Flusso di cassa e rendimento",
  cashflowMensuel: "Flusso di cassa mensile",
  loyerChargesFrais12Mensualite: "affitto − spese − costi/12 − rata",
  rentabiliteBrute: "Rendimento lordo",
  loyerAnnuelPrixDAcquisition: "affitto annuo / prezzo totale di acquisizione",
  rentabiliteNette: "Rendimento netto",
  loyerChargesFraisPrixD: "(affitto − spese − costi) / prezzo totale di acquisizione",
  prixAuM: "Prezzo al m²",
  mensualiteDeLEmpruntRattache: "Rata del prestito collegato",
  prixDAcquisitionTotal: "Prezzo totale di acquisizione",
  prixDAchatFraisNotaire: "prezzo di acquisto + spese (notaio, lavori...)",
}

export default immobilierApercu
