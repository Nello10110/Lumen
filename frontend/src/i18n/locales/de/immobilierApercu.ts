import type fr from '../fr/immobilierApercu'
import type { Structure } from '../../types'

/** Allemand — espace « immobilierApercu » (backlog § BL.2), traduit depuis le français. */
const immobilierApercu: Structure<typeof fr> = {
  cashflowEtRentabilite: "Cashflow und Rendite",
  cashflowMensuel: "Monatlicher Cashflow",
  loyerChargesFrais12Mensualite: "Miete − Nebenkosten − Kosten/12 − Rate",
  rentabiliteBrute: "Bruttorendite",
  loyerAnnuelPrixDAcquisition: "Jahresmiete / Gesamtkaufpreis",
  rentabiliteNette: "Nettorendite",
  loyerChargesFraisPrixD: "(Miete − Nebenkosten − Kosten) / Gesamtkaufpreis",
  prixAuM: "Preis pro m²",
  mensualiteDeLEmpruntRattache: "Rate des verknüpften Kredits",
  prixDAcquisitionTotal: "Gesamtkaufpreis",
  prixDAchatFraisNotaire: "Kaufpreis + Kosten (Notar, Arbeiten...)",
}

export default immobilierApercu
