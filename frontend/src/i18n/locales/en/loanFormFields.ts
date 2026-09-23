import type fr from '../fr/loanFormFields'
import type { Structure } from '../../types'

/** Anglais — espace « loanFormFields » (backlog § BL.2), traduit depuis le français. */
const loanFormFields: Structure<typeof fr> = {
  libelle: "Label",
  creditImmobilier: "Mortgage",
  capitalInitial: "Initial principal",
  tauxAnnuel: "Annual rate (%)",
  mensualite: "Monthly payment",
  dateDeDebut: "Start date",
  dureeMois: "Term (months)",
  ariaLibelle: "Label of {emprunt} (editing)",
  ariaCapital: "Initial principal of {emprunt} (editing)",
  ariaTaux: "Annual rate of {emprunt} (editing)",
  ariaMensualite: "Monthly payment of {emprunt} (editing)",
  ariaDateDebut: "Start date of {emprunt} (editing)",
  ariaDuree: "Term of {emprunt} (editing)",
}

export default loanFormFields
