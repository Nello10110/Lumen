import type fr from '../fr/analysePage'
import type { Structure } from '../../types'

/** Anglais — espace « analysePage » (backlog § BL.2), traduit depuis le français. */
const analysePage: Structure<typeof fr> = {
  analyse: "Analysis",
  actualisation: "Refreshing...",
  actualiser: "Refresh",
  sectionsDeLAnalyse: "Analysis sections",
  valeurDesPositions: "Value of positions",
  scoreDeDiversification: "Diversification score",
  repartitionGeographique: "Geographic allocation",
  geographieDesFondsEtfIssue: "Geography of funds/ETFs taken from their actual holdings (10 largest lines, extrapolated to 100% of the fund) when Yahoo Finance provides them, otherwise estimated from the index the fund tracks (see the data quality details below); fund sectors based on their full holdings. Click a bar (or a row of the full-screen table) to see the lines behind it.",
  repartitionSectorielle: "Sector allocation",
  ongletPortefeuille: "Portfolio",
  ongletRepartition: "Allocation",
  ongletDiagnostic: "Diagnosis",
  ongletEvolution: "Trend",
  ongletRevenus: "Income",
  ongletAchatLocation: "Buy vs rent",
  ongletSimulateur: "Simulator",
}

export default analysePage
