import type fr from '../fr/rapportPage'
import type { Structure } from '../../types'

/** Anglais — espace « rapportPage » (backlog § BL.2), traduit depuis le français. */
const rapportPage: Structure<typeof fr> = {
  debutDePeriode: "Start of period",
  investiParVous: "Invested by you",
  genereSeul: "Generated on its own",
  finDePeriode: "End of period",
  rapport: "Report",
  periode: "Period",
  au: "to",
  laDateDeFinDoit: "The end date must be on or after the start date.",
  aucuneDonneeDisponiblePourCette: "No data available for this period (no transaction, portfolio not yet built at that date).",
  valeurEnFinDePeriode: "Value at end of period",
  evolutionSurLaPeriode: "Change over the period",
  dividendesPercus: "Dividends received",
  dOuVientLEvolution: "Where does the change come from?",
  investiCeQueVousAvez: "“Invested”: what you added yourself (real purchases) over the period. “Generated”: gains, dividends and interest — what the portfolio produced on its own, separate from the money added.",
  plusGrosMouvementsDeLa: "Largest transactions of the period",
  aucunMouvementSurCettePeriode: "No transaction over this period.",
  epargne: "Savings",
  epargneEnFinDePeriode: "Savings at end of period",
  livretsPeePercoAssuranceVie: "savings accounts, PEE/PERCO, life insurance, PER, current accounts",
  evolutionDeLEpargne: "Change in savings",
  dOuVientLEvolution2: "Where does the change in savings come from? (estimate)",
  dOuVientLEvolution3: "Where does the change in savings come from?",
  versementsEstimes: "Estimated contributions",
  versementsDeclares: "Declared contributions",
  interetsEstimesLivrets: "Estimated interest (savings accounts)",
  interetsResidu: "Interest (remainder)",
  contrairementAuPortefeuilleFinancierL: "Unlike the financial portfolio, savings have no ledger of contributions: “Estimated interest” applies each savings account’s declared rate, prorated over the period; “Estimated contributions” is the rest of the change — an estimate, never a measured amount. Specify “of which contribution” when adding a valuation to replace this estimate with real data.",
  versementsDeclaresEstLaSomme: "“Declared contributions” is the sum of the amounts you specified (“of which contribution”) on the period’s valuation points — real data. “Interest” is the rest of the change: if a contribution of the period was not specified, it would be counted here by mistake.",
  repartitionDeLEpargnePar: "Savings by type",
  modeMensuel: "Monthly",
  modeAnnuel: "Yearly",
  modePersonnalise: "Custom",
  periodeDuAu: "{debut} to {fin}",
}

export default rapportPage
