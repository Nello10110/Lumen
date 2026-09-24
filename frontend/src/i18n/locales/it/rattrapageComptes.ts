import type fr from '../fr/rattrapageComptes'
import type { Structure } from '../../types'

/** Italien — espace « rattrapageComptes » (backlog § BL.2), traduit depuis le français. */
const rattrapageComptes: Structure<typeof fr> = {
  rattacherVosLignesAUn: "Colleghi le Sue righe a un conto",
  chaqueLigneFinanciereDoitDesormais: "Ogni riga finanziaria deve ora essere collegata a un conto (immobili, un veicolo o un altro bene ne sono esenti). Scelga un conto esistente o ne crei uno per ciascuna delle righe qui sotto.",
  toutesVosLignesSontDesormais: "Tutte le Sue righe sono ora collegate a un conto.",
  compte: "Conto",
  choisir: "— Scegli —",
  nouveauCompte: "+ Nuovo conto...",
  nomDuNouveauCompte: "Nome del nuovo conto",
  peaCto: "PEA, CTO...",
  etablissement: "Istituto",
  valider: "Conferma",
  chargement: "Caricamento…",
  continuer: "Continua",
  ariaComptePour: "Conto per {ticker}",
  ariaNomNouveauComptePour: "Nome del nuovo conto per {ticker}",
  ariaEtablissementPour: "Istituto per {ticker}",
}

export default rattrapageComptes
