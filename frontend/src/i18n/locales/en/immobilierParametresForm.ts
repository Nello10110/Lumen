import type fr from '../fr/immobilierParametresForm'
import type { Structure } from '../../types'

/** Anglais — espace « immobilierParametresForm » (backlog § BL.2), traduit depuis le français. */
const immobilierParametresForm: Structure<typeof fr> = {
  immobilierCaracteristiquesEtLocation: "Real estate — features and rental",
  residencePrincipale: "Main residence",
  typeDeLocation: "Rental type",
  loyerMensuel: "Monthly rent (€)",
  chargesMensuelles: "Monthly charges (€)",
  fraisAnnuelsTaxeFonciereCopropriete: "Annual costs (property tax, co-ownership, insurance, management — total)",
  fraisDeNotaire: "Notary fees (€)",
  travaux: "Works (€)",
  autresFraisDAcquisitionAgence: "Other acquisition costs (agency, guarantee... — €)",
  surfaceM: "Area (m²)",
  nombreDePieces: "Number of rooms",
  anneeDeConstruction: "Year built",
  dpe: "Energy rating (DPE)",
  aAG: "A to G",
  simulateurAchatVsLocation: "Buy vs rent simulator",
  cesValeursAlimententUniquementLa: "These values only feed the comparison with renting (“Buy vs rent” tab of the Analysis page) — they never count in the yield calculation above.",
  loyerMensuelEstimePourUn: "Estimated monthly rent for an equivalent property (€)",
  taxeDHabitationAnnuelle: "Annual housing tax (€)",
  chargesMensuellesDeComparaisonCopropriete: "Monthly comparison charges (co-ownership, insurance, upkeep — €)",
  enregistrement: "Saving...",
  enregistrer: "Save",
  locationNonRenseigne: "Not specified",
  locationNue: "Unfurnished rental",
  locationMeublee: "Furnished rental",
  locationPinel: "Pinel scheme",
  locationLmnp: "LMNP scheme",
  locationSaisonniere: "Holiday rental",
}

export default immobilierParametresForm
