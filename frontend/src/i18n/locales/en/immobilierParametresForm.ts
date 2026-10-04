import type fr from '../fr/immobilierParametresForm'
import type { Structure } from '../../types'

/** Anglais — espace « immobilierParametresForm » (backlog § BL.2), traduit depuis le français. */
const immobilierParametresForm: Structure<typeof fr> = {
  immobilierCaracteristiquesEtLocation: "Real estate — features and rental",
  residencePrincipale: "Main residence",
  loyerMensuel: "Monthly rent (€)",
  chargesMensuelles: "Monthly charges (€)",
  aideChargesMensuelles: "Used for the cash flow of a rented property and for the buy vs rent simulator of a main residence.",
  fraisAnnuelsTaxeFonciereCopropriete: "Annual costs (property tax, co-ownership, insurance, management — total)",
  fraisDeNotaire: "Notary fees (€)",
  travaux: "Works (€)",
  autresFraisDAcquisitionAgence: "Other acquisition costs (agency, guarantee... — €)",
  surfaceM: "Area (m²)",
  simulateurAchatVsLocation: "Buy vs rent simulator",
  cesValeursAlimententUniquementLa: "Estimated rent and housing tax only feed the comparison with renting (“Buy vs rent” tab of the Analysis page): they never count in the yield. The monthly charges entered above are used there too.",
  loyerMensuelEstimePourUn: "Estimated monthly rent for an equivalent property (€)",
  taxeDHabitationAnnuelle: "Annual housing tax (€)",
  enregistrement: "Saving...",
  enregistrer: "Save",
  enregistre: "Saved",
}

export default immobilierParametresForm
