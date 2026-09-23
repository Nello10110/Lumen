import type fr from '../fr/simulateurAchatLocationCard'
import type { Structure } from '../../types'

/** Anglais — espace « simulateurAchatLocationCard » (backlog § BL.2), traduit depuis le français. */
const simulateurAchatLocationCard: Structure<typeof fr> = {
  achatVsLocation: "Buy vs rent",
  aucunBienImmobilierEnregistre: "No property recorded",
  ajouterUnBienImmobilier: "Add a property",
  aucuneResidencePrincipaleConfiguree: "No main residence set up",
  cochezResidencePrincipaleSurLa: "Tick “Main residence” on the property’s sheet to enable this simulator.",
  configurer: "Set up “",
  cochezResidencePrincipaleSurLa2: "Tick “Main residence” on the sheet of one of your properties to enable this simulator.",
  simulateurNonConfigure: "Simulator not set up",
  configurerLeSimulateur: "Set up the simulator",
  loyerEstimeBienEquivalent: "Estimated rent (equivalent property)",
  mois: " / month",
  coutMensuelDePossession: "Monthly cost of ownership",
  interetsChargesTaxeDHabitation: "Interest + charges + housing tax",
  chargesTaxeDHabitationPas: "Charges + housing tax (no linked loan)",
  ecart: "Difference",
  possederCouteMoinsCherQue: "Owning costs less than renting",
  louerCouteraitMoinsCherCe: "Renting would cost less this month",
  fraisDAcquisitionVerses: "Acquisition costs paid:",
  nonInclusDansLaComparaison: "— not included in the monthly comparison above.",
  comparaisonIndicativeSeuleLaPart: "Indicative comparison: only the loan’s interest counts (repaid principal remains your wealth), excluding changes in the property’s value and any alternative investment of the down payment.",
  bien: "Property",
  renseignezLoyer: "Enter the estimated monthly rent on the “{bien}” sheet to enable the comparison.",
  soitMoisDeLoyer: " (about {mois} months of rent at this rate)",
}

export default simulateurAchatLocationCard
