import type fr from '../fr/rattrapageComptes'
import type { Structure } from '../../types'

/** Anglais — espace « rattrapageComptes » (backlog § BL.2), traduit depuis le français. */
const rattrapageComptes: Structure<typeof fr> = {
  rattacherVosLignesAUn: "Link your lines to an account",
  chaqueLigneFinanciereDoitDesormais: "Each financial line must now be linked to an account (real estate, a vehicle or another item are exempt). Choose an existing account or create one for each of the lines below.",
  toutesVosLignesSontDesormais: "All your lines are now linked to an account.",
  compte: "Account",
  choisir: "— Choose —",
  nouveauCompte: "+ New account...",
  nomDuNouveauCompte: "New account name",
  peaCto: "PEA, CTO...",
  etablissement: "Institution",
  valider: "Confirm",
  chargement: "Loading…",
  continuer: "Continue",
  ariaComptePour: "Account for {ticker}",
  ariaNomNouveauComptePour: "New account name for {ticker}",
  ariaEtablissementPour: "Institution for {ticker}",
}

export default rattrapageComptes
