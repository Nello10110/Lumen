import type fr from '../fr/plusValueParCompteCard'
import type { Structure } from '../../types'

/** Anglais — espace « plusValueParCompteCard » (backlog § BL.2), traduit depuis le français. */
const plusValueParCompteCard: Structure<typeof fr> = {
  plusValueParCompte: "Gain by account",
  rienAComparerPourL: "Nothing to compare yet.",
  ceComparatifPorteSurLes: "This comparison covers lines with a known cost basis (stocks, funds, real estate...) — a current account or savings account has none.",
  plusValueLatenteValeurActuelle: "Unrealized gain (current value minus cost basis) by account — spot at a glance the accounts pulling your wealth up or down.",
  plusValue: "Gain",
  moinsValue: "Loss",
  compte: "Account",
  valeur: "Value",
  moyenneDesRendementsAnnualisesXirr: "Average of the annualized returns (XIRR) of each line in the account, weighted by their current value — indicative, not a flow-by-flow calculation at account level.",
  rendementAnnualise: "Annualized return",
  pasDeValorisationConnuePour: "No known valuation for this account (positions valued at cost, for lack of a price).",
}

export default plusValueParCompteCard
