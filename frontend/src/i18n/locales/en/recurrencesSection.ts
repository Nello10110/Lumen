import type fr from '../fr/recurrencesSection'
import type { Structure } from '../../types'

/** Anglais — espace « recurrencesSection » (backlog § BL.2), traduit depuis le français. */
const recurrencesSection: Structure<typeof fr> = {
  chargesRecurrentesEtAbonnements: "Recurring charges and subscriptions",
  detecteAutomatiquementSurLes12: "Detected automatically over the last 12 months — transactions recurring at least twice under the same description, still seen within the last 45 days.",
  libelle: "Description",
  categorie: "Category",
  periodicite: "Frequency",
  occurrences: "Occurrences",
  montant: "Amount",
  mensuelle: "Monthly",
  irreguliere: "Irregular",
  hausseDePrix: "Price increase",
}

export default recurrencesSection
