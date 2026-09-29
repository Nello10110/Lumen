import type fr from '../fr/recurrencesSection'
import type { Structure } from '../../types'

/** Anglais — espace « recurrencesSection » (backlog § BL.2), traduit depuis le français. */
const recurrencesSection: Structure<typeof fr> = {
  chargesRecurrentesEtAbonnements: "Recurring charges and subscriptions",
  detecteAutomatiquement: "Detected automatically from the imported history — transactions recurring at least twice under the same description (dates the bank adds to card payments are ignored), on a monthly, quarterly or yearly rhythm, and still ongoing. The annual cost is estimated from the current amount.",
  libelle: "Description",
  categorie: "Category",
  periodicite: "Frequency",
  occurrences: "Occurrences",
  montant: "Amount",
  mensuelle: "Monthly",
  trimestrielle: "Quarterly",
  annuelle: "Yearly",
  hausseDePrix: "Price increase",
  evolutionDepuis: "{pct} since {montant}",
  coutAnnuelEstime: "Estimated annual cost",
  achatsFrequents: "Frequent purchases",
  achatsFrequentsAide: "Merchants or transfers that recur without a regular rhythm: they are not counted as recurring charges.",
  totalObserve: "Total over the observed period",
  totalAbonnements: "Subscriptions and direct debits: {annuel}/year · {mensuel}/month",
}

export default recurrencesSection
