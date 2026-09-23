import type fr from '../fr/ajoutCompteForm'
import type { Structure } from '../../types'

/** Espagnol — espace « ajoutCompteForm » (backlog § BL.2), traduit depuis le français. */
const ajoutCompteForm: Structure<typeof fr> = {
  nom: "Nombre",
  peaLivretA: "PEA, Livret A...",
  type: "Tipo",
  valeurInitialeOptionnel: "Valor inicial (€, opcional)",
  versementMensuelOptionnel: "Aportación mensual (€, opcional)",
  etablissement: "Entidad",
  nouveauCompte: "+ Nueva cuenta",
  compteVide: "— Cuenta vacía —",
  aideNom: "El nombre que USTED le da, no un número de cuenta: «PEA Boursorama», «Livret A», «Piso en Lyon». Es el nombre que aparecerá en toda la aplicación.",
  aideEtablissement: "El banco o bróker que aloja esta cuenta: una cuenta siempre debe tener una entidad. Elija una existente o créela al vuelo.",
}

export default ajoutCompteForm
