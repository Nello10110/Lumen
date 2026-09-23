import type fr from '../fr/holdingCategories'
import type { Structure } from '../../types'

/** Anglais — espace « holdingCategories » (backlog § BL.2), traduit depuis le français. */
const holdingCategories: Structure<typeof fr> = {
  decoteAnnuelle: "Annual depreciation (%)",
  tauxDInteretAnnuel: "Annual interest rate (%)",
  onglet: { tous: "All", actions: "Stocks", etf: "ETFs", obligations: "Bonds", privateEquity: "Private equity", crypto: "Crypto", immobilierEpargne: "Real estate & Savings", autres: "Other" },
  type: { nonPrecise: "Not specified", action: "Stock", etfFonds: "ETF / Fund", crypto: "Crypto", obligation: "Bond", privateEquity: "Private equity", immobilier: "Real estate", scpi: "SCPI (real estate fund)", assuranceVie: "Life insurance", per: "PER / Retirement savings", compteCourant: "Current account", epargneReglementee: "Regulated savings (Livret A, LDDS...)", epargneSalariale: "Employee savings (PEE, PERCO...)", vehicule: "Vehicle", autreActif: "Other asset" },
  aidePrixRevient: "Amount invested at purchase. For an imported stock/ETF, calculated automatically from your transactions; for a line entered by hand (real estate, life insurance...), to be filled in yourself. It stays a fixed base, used to calculate your gain or loss.",
  aideValeurEstimee: "Current value of the asset, to be updated yourself (agency estimate, valuation...) — only concerns lines valued manually (real estate, SCPI, life insurance...). It then replaces the price × quantity calculation. Every change is kept in the history, never silently overwritten.",
}

export default holdingCategories
