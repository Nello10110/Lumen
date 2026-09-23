import type fr from '../fr/valorisationHistoriqueCard'
import type { Structure } from '../../types'

/** Anglais — espace « valorisationHistoriqueCard » (backlog § BL.2), traduit depuis le français. */
const valorisationHistoriqueCard: Structure<typeof fr> = {
  historiqueDeValorisation: "Valuation history",
  chaqueEstimationEstDateeEt: "Every estimate is dated and kept — the previous one is never overwritten.",
  lePremierPointCoutD: " The first point (acquisition cost) is added to the chart, not to the table below.",
  date: "Date",
  valeurEstimee: "Estimated value",
  actions: "Actions",
  valeur: "Value (€)",
  dontVersement: "Of which contribution (€)",
  dontPlusValue: "Of which gain (€)",
  enregistrer: "Save",
  annuler: "Cancel",
  dont: "of which",
  verses: "contributed",
  modifier: "Edit",
  supprimer: "Delete",
  supprimerCePointDHistorique: "Delete this history point?",
  lePointDu: "The point of",
  seraDefinitivementSupprime: ") will be permanently deleted.",
  suppression: "Deleting...",
  ariaValeur: "Value on {date} (editing)",
  ariaDate: "Date of {date} (editing)",
  ariaVersement: "Contribution on {date} (editing)",
  ariaPlusValue: "Gain on {date} (editing)",
}

export default valorisationHistoriqueCard
