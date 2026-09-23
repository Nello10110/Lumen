import type fr from '../fr/metriquesAvanceesCard'
import type { Structure } from '../../types'

/** Anglais — espace « metriquesAvanceesCard » (backlog § BL.2), traduit depuis le français. */
const metriquesAvanceesCard: Structure<typeof fr> = {
  metriquesDePerformanceAvancees: "Advanced performance metrics",
  leRendementAnnualiseAfficheCi: "The annualized return shown above (money-weighted, XIRR) judges your decisions — when and how much you invested. The",
  twr: "TWR",
  timeWeightedCiDessousNeutralise: "(time-weighted, below) removes the effect of your contributions to judge the investment itself: two people invested in the same portfolio at the same time have the same TWR, even with different amounts.",
  historiqueInsuffisantPourCalculerCes: "Not enough history to calculate these metrics.",
  performanceDuPlacementCumulee: "Investment performance (cumulative)",
  twrCumule: "Cumulative TWR",
  performanceDuPlacementParAn: "Investment performance (per year)",
  twrAnnualise: "Annualized TWR",
  regulariteDuParcours: "Steadiness of the path",
  volatiliteAnnualisee: "Annualized volatility",
  pireChuteEssuyee: "Worst drop suffered",
  perteMaximaleDrawdown: "Maximum loss (drawdown)",
  nonRecupereACeJour: "not recovered to date",
  comparaisonAUnIndice: "Comparison with an index",
  choisirUnIndiceDeReference: "Choose a benchmark index",
  choisisUnIndicePourComparer: "Choose an index to compare your portfolio’s performance (in %, since tracking began) with that index over the same period.",
  recupereEnSemaines: { one: "recovered in {n} week", other: "recovered in {n} weeks" },
}

export default metriquesAvanceesCard
