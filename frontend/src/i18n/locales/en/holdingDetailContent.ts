import type fr from '../fr/holdingDetailContent'
import type { Structure } from '../../types'

/** Anglais — espace « holdingDetailContent » (backlog § BL.2), traduit depuis le français. */
const holdingDetailContent: Structure<typeof fr> = {
  residencePrincipale: "Main residence",
  depuisLAchat: "since purchase",
  sectionsDeLaFiche: "Detail sections",
  quantite: "Quantity",
  prixDeRevient: "Cost basis",
  prixActuel: "Current price",
  valeur: "Value",
  depuisAchat: "Since purchase",
  rendementAnnualise: "Annualized return",
  indisponibleDetentionTropRecenteOu: "unavailable: held too recently, or no sale/income known since purchase",
  secteur: "Sector",
  pays: "Country",
  emetteurResumeFrais: "Issuer, summary & fees",
  emetteur: "Issuer:",
  informationsNonDisponibles: "Information not available.",
  fraisDeGestionAnnuels: "Annual management fees",
  fraisDeTransactionPayesCumules: "Transaction fees paid (cumulative)",
  repartitionGeographique: "Geographic allocation",
  repartitionSectorielle: "Sector allocation",
  repartitionGeographiqueDetaillee: "Detailed geographic allocation",
  repartitionSectorielleDetaillee: "Detailed sector allocation",
  compositionEnActions10Plus: "Equity holdings (the fund’s 10 largest lines)",
  action: "Stock",
  proportion: "Weight",
  ongletApercu: "Overview",
  ongletAnalyse: "Analysis",
  ongletParametres: "Settings",
}

export default holdingDetailContent
