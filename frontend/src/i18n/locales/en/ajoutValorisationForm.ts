import type fr from '../fr/ajoutValorisationForm'
import type { Structure } from '../../types'

/** Anglais — espace « ajoutValorisationForm » (backlog § BL.2), traduit depuis le français. */
const ajoutValorisationForm: Structure<typeof fr> = {
  valeur: "Value (€)",
  date: "Date",
  dontVersement: "Of which contribution (€)",
  dontPlusValue: "Of which gain (€)",
  enregistrement: "Saving...",
  ajouterUneValorisation: "Add a valuation",
  versementOuPlusValueAu: "Contribution or gain, as you prefer — the other is deduced automatically from the change since the previous point. Leave empty if you do not know: the Report screen will keep estimating the gain from the declared rate.",
}

export default ajoutValorisationForm
