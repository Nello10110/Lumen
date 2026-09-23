import type fr from '../fr/evolutionFinanciereCard'
import type { Structure } from '../../types'

/** Anglais — espace « evolutionFinanciereCard » (backlog § BL.2), traduit depuis le français. */
const evolutionFinanciereCard: Structure<typeof fr> = {
  aucunePositionSuiviePourL: "No position tracked yet.",
  importezUnReleveOuAjoutez: "Import a statement or add a line (real estate, PER, life insurance...) from",
  import: "Import",
  ou: "or",
  actifs: "Assets",
  classeDActif: "Asset class",
  tout: "All",
  etablissementOuCompte: "Institution or account",
  etablissements: "Institutions",
  comptes: "Accounts",
  detenteur: "Holder",
  foyer: "Household",
  periodeDuGraphique: "Chart period",
  dateDeDebut: "Start date",
  au: "to",
  dateDeFin: "End date",
  superposeLInvestiSousLe: "Overlays the invested amount under the total: the visible band between the two curves is the gains.",
  modeEtage: "Stacked mode",
  brutOuNetEmpruntsDeduits: "Gross or net (loans deducted)",
  laDateDeFinDoit: "The end date must be on or after the start date.",
  calculDeLHistoriqueEn: "Calculating history...",
  aucunHistoriquePourCetteCombinaison: "No history for this combination of filters.",
  investi: "Invested",
  gains: "Gains",
  pourLImmobilierLEpargne: "For real estate/savings, only an explicitly declared contribution counts as “Invested” — an undeclared increase is treated as a gain.",
  detailDesLignes: "Line details",
  periodePersonnalisee: "Custom",
  lentilleNet: "Net",
  lentilleBrut: "Gross",
}

export default evolutionFinanciereCard
