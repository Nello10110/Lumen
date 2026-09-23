import type fr from '../fr/patrimoineNetCard'
import type { Structure } from '../../types'

/** Anglais — espace « patrimoineNetCard » (backlog § BL.2), traduit depuis le français. */
const patrimoineNetCard: Structure<typeof fr> = {
  patrimoineNet: "Net worth",
  patrimoineBrut: "Gross assets",
  patrimoineFinancier: "Financial assets",
  foyer: "Household",
  detenteurSelectionne: "Selected holder",
  financier: "Financial",
  actionsEtfCryptoObligations: "Stocks, ETFs, crypto, bonds",
  immobilierEpargne: "Real estate & savings",
  biensAssurancesVieLivrets: "Properties, life insurance, savings accounts",
  emprunts: "Loans",
  capitalRestantDu: "Outstanding principal",
  parTypeDInvestissement: "By type of investment",
  legendeFinancier: "tracked portfolio, excluding real estate/savings/debts",
  legendeBrut: "tracked gross assets — real estate/savings valued at their latest known points, sometimes far apart",
  legendeNet: "tracked net worth — real estate/savings valued at their latest known points, sometimes far apart",
}

export default patrimoineNetCard
