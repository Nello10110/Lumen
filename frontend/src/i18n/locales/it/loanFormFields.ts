import type fr from '../fr/loanFormFields'
import type { Structure } from '../../types'

/** Italien — espace « loanFormFields » (backlog § BL.2), traduit depuis le français. */
const loanFormFields: Structure<typeof fr> = {
  libelle: "Descrizione",
  creditImmobilier: "Mutuo",
  capitalInitial: "Capitale iniziale",
  tauxAnnuel: "Tasso annuo (%)",
  mensualite: "Rata mensile",
  dateDeDebut: "Data di inizio",
  dureeMois: "Durata (mesi)",
  ariaLibelle: "Descrizione di {emprunt} (modifica)",
  ariaCapital: "Capitale iniziale di {emprunt} (modifica)",
  ariaTaux: "Tasso annuo di {emprunt} (modifica)",
  ariaMensualite: "Rata mensile di {emprunt} (modifica)",
  ariaDateDebut: "Data di inizio di {emprunt} (modifica)",
  ariaDuree: "Durata di {emprunt} (modifica)",
}

export default loanFormFields
