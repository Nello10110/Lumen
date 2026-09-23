import type fr from '../fr/ajoutCompteForm'
import type { Structure } from '../../types'

/** Anglais — espace « ajoutCompteForm » (backlog § BL.2), traduit depuis le français. */
const ajoutCompteForm: Structure<typeof fr> = {
  nom: "Name",
  peaLivretA: "PEA, Livret A...",
  type: "Type",
  valeurInitialeOptionnel: "Initial value (€, optional)",
  versementMensuelOptionnel: "Monthly contribution (€, optional)",
  etablissement: "Institution",
  nouveauCompte: "+ New account",
  compteVide: "— Empty account —",
  aideNom: "The name YOU give it, not an account number: “PEA Boursorama”, “Livret A”, “Lyon apartment”. This is the name that will appear throughout the app.",
  aideEtablissement: "The bank or broker holding this account: an account must always have an institution. Choose an existing one or create it on the fly.",
}

export default ajoutCompteForm
