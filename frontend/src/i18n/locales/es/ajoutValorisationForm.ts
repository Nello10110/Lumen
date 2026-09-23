import type fr from '../fr/ajoutValorisationForm'
import type { Structure } from '../../types'

/** Espagnol — espace « ajoutValorisationForm » (backlog § BL.2), traduit depuis le français. */
const ajoutValorisationForm: Structure<typeof fr> = {
  valeur: "Valor (€)",
  date: "Fecha",
  dontVersement: "De ello, aportación (€)",
  dontPlusValue: "De ello, plusvalía (€)",
  enregistrement: "Guardando...",
  ajouterUneValorisation: "Añadir una valoración",
  versementOuPlusValueAu: "Aportación o plusvalía, a elegir: la otra se deduce automáticamente de la evolución desde el punto anterior. Déjelo vacío si no lo sabe: la pantalla Informe seguirá estimando la ganancia con el tipo declarado.",
}

export default ajoutValorisationForm
