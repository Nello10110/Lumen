import type fr from '../fr/budgetPage'
import type { Structure } from '../../types'

/** Anglais — espace « budgetPage » (backlog § BL.2), traduit depuis le français. */
const budgetPage: Structure<typeof fr> = {
  nonDepense: "Not spent",
  budget: "Budget",
  periode: "Period",
  au: "to",
  laDateDeFinDoit: "The end date must be on or after the start date.",
  aucunMouvementBancaireImportePour: "No bank transaction imported for this period.",
  importeUnReleveCsvOfx: "Import a statement (CSV, OFX or QIF) from the Import screen.",
  disponibleSurLaPeriode: "Available over the period",
  dEntrees: "of inflows −",
  deSorties: "of outflows",
  depensesRecurrentesMois: "Recurring spending / month",
  estimeSurLes3Derniers: "estimated over the last 3 months",
  tauxDEpargneReel: "Actual savings rate",
  sortiesCategorieEpargneEntrees: "“Savings” category outflows / inflows",
  resteAVivre: "Disposable income",
  entreesLogementChargesRecurrentes: "inflows − housing − recurring charges",
  tauxDEpargneIndisponibleCree: "Savings rate unavailable: create or rename a “Savings” category below. ",
  resteAVivreIndisponibleCree: "Disposable income unavailable: create or rename a “Housing” category below.",
  modeMensuel: "Monthly",
  modeAnnuel: "Yearly",
  modePersonnalise: "Custom",
  periodeDuAu: "{debut} to {fin}",
}

export default budgetPage
