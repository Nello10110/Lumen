import type fr from '../fr/loanFormFields'
import type { Structure } from '../../types'

/** Allemand — espace « loanFormFields » (backlog § BL.2), traduit depuis le français. */
const loanFormFields: Structure<typeof fr> = {
  libelle: "Bezeichnung",
  creditImmobilier: "Immobilienkredit",
  capitalInitial: "Anfangskapital",
  tauxAnnuel: "Jahreszins (%)",
  mensualite: "Monatsrate",
  dateDeDebut: "Startdatum",
  dureeMois: "Laufzeit (Monate)",
  ariaLibelle: "Bezeichnung von {emprunt} (Bearbeitung)",
  ariaCapital: "Anfangskapital von {emprunt} (Bearbeitung)",
  ariaTaux: "Jahreszins von {emprunt} (Bearbeitung)",
  ariaMensualite: "Monatsrate von {emprunt} (Bearbeitung)",
  ariaDateDebut: "Startdatum von {emprunt} (Bearbeitung)",
  ariaDuree: "Laufzeit von {emprunt} (Bearbeitung)",
}

export default loanFormFields
