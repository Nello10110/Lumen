import type fr from '../fr/selecteurCompte'
import type { Structure } from '../../types'

/** Espagnol — espace « selecteurCompte » (backlog § BM.1), traduit depuis le français. */
const selecteurCompte: Structure<typeof fr> = {
  compte: "Cuenta *",
  choisir: "— Elegir una cuenta —",
  nouveauCompte: "+ Nueva cuenta...",
  sansEtablissement: "Sin entidad",
  nomDuNouveauCompte: "Nombre de la nueva cuenta *",
  exemplesNom: "Cuenta corriente, cuenta de ahorro...",
  etablissement: "Entidad *",
  etablissementDuNouveauCompte: "Entidad de la nueva cuenta",
}

export default selecteurCompte
