import type fr from '../fr/ajoutHoldingForm'
import type { Structure } from '../../types'

/** Anglais — espace « ajoutHoldingForm » (backlog § BL.2), traduit depuis le français. */
const ajoutHoldingForm: Structure<typeof fr> = {
  unActif: "An asset",
  unEmprunt: "A loan",
  quAjoutezVous: "What are you adding?",
  renseignezTousLesChampsDe: "Fill in all the loan fields.",
  ajouter: "Add",
  typeDActif: "Asset type",
  nom: "Name",
  appartementLyonPeugeot208: "Lyon apartment, Peugeot 208...",
  identifiant: "Identifier",
  calculeDepuisLeNomEn: "Derived from the Name, in capitals — correct it if needed.",
  ticker: "Ticker",
  aapl: "AAPL",
  quantite: "Quantity",
  prixDeRevient: "Cost basis",
  compte: "Account",
  choisir: "— Choose —",
  nouveauCompte: "+ New account...",
  nomDuNouveauCompte: "New account name",
  peaCto: "PEA, securities account...",
  etablissement: "Institution",
  etablissementDuNouveauCompte: "New account institution",
  valeurEstimee: "Estimated value",
  optionnel: "optional",
  versementMensuel: "Monthly contribution (€)",
  zoneGeographique: "Geographic area",
  europeParDefaut: "Europe (default)",
  dateDAcquisition: "Acquisition date",
  renseignezAuMinimumUnTicker: "Enter at least a ticker and a quantity.",
  valeurDAcquisition: "Acquisition value:",
  texte: "×",
  immobilierScpiAssuranceViePer: "Real estate, SCPI, life insurance, PER, current/savings account, vehicle: valued by Estimated value rather than quantity × price — it replaces the calculation and is updated by hand, periodically.",
  valeurProjeteeDans1An: "Projected value in 1 year (indicative, never applied automatically):",
  ajouterUneLigneManuellement: "Add a line manually",
}

export default ajoutHoldingForm
