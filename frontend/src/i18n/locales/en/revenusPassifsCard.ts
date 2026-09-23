import type fr from '../fr/revenusPassifsCard'
import type { Structure } from '../../types'

/** Anglais — espace « revenusPassifsCard » (backlog § BL.2), traduit depuis le français. */
const revenusPassifsCard: Structure<typeof fr> = {
  revenusPassifsProjetes12Mois: "Projected passive income (12 months)",
  aucunRevenuPassifDetecte: "No passive income detected.",
  renseigneUnLoyerSurUne: "Enter a rent on a property sheet, a rate on a savings line, or import a history with dividends received.",
  projectionAnnuelle: "Annual projection",
  projectionMensuelle: "Monthly projection",
  certain: "Certain",
  loyersNets: "Net rents",
  interetsDeLivrets: "Savings account interest",
  estime12DerniersMoisExtrapoles: "Estimated (last 12 months extrapolated)",
  dividendes: "Dividends",
  interetsDeCourtage: "Brokerage interest",
  laPartCertaineReposeSur: "The “certain” part relies on amounts already known (rent, declared rate). The “estimated” part extrapolates the last 12 months actually received — never a promise for the next 12.",
}

export default revenusPassifsCard
