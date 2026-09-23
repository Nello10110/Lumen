import type fr from '../fr/loanFormFields'
import type { Structure } from '../../types'

/** Espagnol — espace « loanFormFields » (backlog § BL.2), traduit depuis le français. */
const loanFormFields: Structure<typeof fr> = {
  libelle: "Nombre",
  creditImmobilier: "Crédito hipotecario",
  capitalInitial: "Capital inicial",
  tauxAnnuel: "Tipo anual (%)",
  mensualite: "Cuota mensual",
  dateDeDebut: "Fecha de inicio",
  dureeMois: "Duración (meses)",
  ariaLibelle: "Nombre de {emprunt} (edición)",
  ariaCapital: "Capital inicial de {emprunt} (edición)",
  ariaTaux: "Tipo anual de {emprunt} (edición)",
  ariaMensualite: "Cuota mensual de {emprunt} (edición)",
  ariaDateDebut: "Fecha de inicio de {emprunt} (edición)",
  ariaDuree: "Duración de {emprunt} (edición)",
}

export default loanFormFields
