import type fr from '../fr/comptesPage'
import type { Structure } from '../../types'

/** Anglais — espace « comptesPage » (backlog § BL.2), traduit depuis le français. */
const comptesPage: Structure<typeof fr> = {
  comptes: "Accounts",
  etablissement: "Institution",
  ajouterUnCompte: "Add an account",
  tousLesComptesDuFoyer: "All the household’s accounts — current account, PEA, securities account, life insurance, real estate, savings — grouped by institution, with their balance. Click an account to see its details, edit a savings line or add a valuation to it, and set a split between holders for the whole account at once.",
  unCompteEstUnContenant: "An account is a container (your PEA, your savings account, your apartment’s account); the wealth lines are what it contains. Click an account to see its lines.",
  quEstCeQuUn: "What is an account?",
  valeurEpargneTotale: "Total savings value",
  versementMensuelTotal: "Total monthly contribution",
  additionneAuPreremplissageDuSimulateur: "added to the Simulator’s pre-fill",
  aucunCompteDeclare: "No account declared.",
  creeUnCompteCiDessus: "Create an account above (empty, or a savings line by choosing a type), or link one directly from Assets when adding a position.",
  renommerChangerLeLogo: "Rename, change the logo",
  ceNEstPasUn: "This is not an account, but the group of your wealth lines that are not linked to any account. To file them, open the line from Assets and choose an account for it.",
  sansCompte: "No account",
  miseAJourLe: "· updated on",
  repartitionEntreDetenteursIncompleteSur: "Split between holders incomplete on at least one line of this account",
  repartitionEntreDetenteursNonRenseignee: "Split between holders not set for this account — click to define it",
  etablissements: "Institutions",
  fermer: "Close",
  sansEtablissement: "No institution",
  modifierEtablissementAria: "Edit the institution {nom}",
  nLignes: { one: "{n} line", other: "{n} lines" },
}

export default comptesPage
