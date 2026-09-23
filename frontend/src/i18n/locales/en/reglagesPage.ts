import type fr from '../fr/reglagesPage'
import type { Structure } from '../../types'

/** Anglais — espace « reglagesPage » (backlog § BL.2), traduit depuis le français. */
const reglagesPage: Structure<typeof fr> = {
  reglages: "Settings",
  categoriesDeReglages: "Settings categories",
  assistantDeBienvenue: "Welcome wizard",
  leParcoursGuideAfficheA: "The guided tour shown when this account was created — useful to rediscover the initial settings, or to review those not filled in the first time.",
  revoirLAssistantDeBienvenue: "Replay the welcome wizard",
  langageSimple: "Plain language",
  remplaceLeJargonFinancierTwr: "Replaces financial jargon (TWR, volatility, drawdown...) with everyday wording, with the technical term always reachable behind a “technical term” link.",
  active: "Enabled",
  desactive: "Disabled",
  exporter: "Export",
  fichiersCsvCompatiblesExcelSeparateur: "Excel-compatible CSV files (semicolon separator, comma decimal), downloaded directly by the browser.",
  positions: "Positions",
  transactions: "Transactions",
  rentabilite: "Returns",
  releveDePatrimoinePdfUne: "Wealth statement PDF: a formatted snapshot, ready to print or archive — net worth, allocation and overall return.",
  releveDePatrimoinePdf: "Wealth statement (PDF)",
  declarationDePatrimoineIntro: "Statement of assets: a configurable document for a specific third party (a bank for a loan, a notary for a gift) — asset-by-asset selection, filtering by holder, optional borrower profile.",
  declarationDePatrimoinePdf: "Statement of assets (PDF)",
  bilanAnnuelEvolutionDuPatrimoine: "Annual review: change in net worth and milestones reached over a year, with the current situation for the current year.",
  anneeDuBilan: "Review year",
  bilanAnnuelPdf: "Annual review (PDF)",
  aucuneTachePlanifiee: "No scheduled task.",
  ongletGeneral: "General",
  ongletDetenteurs: "Holders",
  ongletSecurite: "Accounts & security",
  ongletPartage: "Sharing",
  ongletAutomatisations: "Automations",
  ongletBadges: "Badges",
}

export default reglagesPage
