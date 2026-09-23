import type fr from '../fr/budgetPage'
import type { Structure } from '../../types'

/** Italien — espace « budgetPage » (backlog § BL.2), traduit depuis le français. */
const budgetPage: Structure<typeof fr> = {
  nonDepense: "Non speso",
  budget: "Budget",
  periode: "Periodo",
  au: "al",
  laDateDeFinDoit: "La data di fine deve essere uguale o successiva alla data di inizio.",
  aucunMouvementBancaireImportePour: "Nessun movimento bancario importato per questo periodo.",
  importeUnReleveCsvOfx: "Importa un estratto (CSV, OFX o QIF) dalla schermata Importa.",
  disponibleSurLaPeriode: "Disponibile nel periodo",
  dEntrees: "di entrate −",
  deSorties: "di uscite",
  depensesRecurrentesMois: "Spese ricorrenti / mese",
  estimeSurLes3Derniers: "stimato sugli ultimi 3 mesi",
  tauxDEpargneReel: "Tasso di risparmio reale",
  sortiesCategorieEpargneEntrees: "uscite della categoria «Risparmio» / entrate",
  resteAVivre: "Residuo per vivere",
  entreesLogementChargesRecurrentes: "entrate − abitazione − spese ricorrenti",
  tauxDEpargneIndisponibleCree: "Tasso di risparmio non disponibile: crea o rinomina una categoria «Risparmio» qui sotto. ",
  resteAVivreIndisponibleCree: "Residuo per vivere non disponibile: crea o rinomina una categoria «Abitazione» qui sotto.",
  modeMensuel: "Mensile",
  modeAnnuel: "Annuale",
  modePersonnalise: "Personalizzato",
}

export default budgetPage
