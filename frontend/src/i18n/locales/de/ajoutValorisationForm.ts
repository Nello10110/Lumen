import type fr from '../fr/ajoutValorisationForm'
import type { Structure } from '../../types'

/** Allemand — espace « ajoutValorisationForm » (backlog § BL.2), traduit depuis le français. */
const ajoutValorisationForm: Structure<typeof fr> = {
  valeur: "Wert (€)",
  date: "Datum",
  dontVersement: "Davon Einzahlung (€)",
  dontPlusValue: "Davon Gewinn (€)",
  enregistrement: "Wird gespeichert...",
  ajouterUneValorisation: "Bewertung hinzufügen",
  versementOuPlusValueAu: "Einzahlung oder Gewinn, nach Wahl — der andere Wert ergibt sich automatisch aus der Entwicklung seit dem vorherigen Punkt. Leer lassen, wenn Sie es nicht wissen: Der Bericht schätzt den Gewinn weiterhin über den erfassten Zinssatz.",
}

export default ajoutValorisationForm
