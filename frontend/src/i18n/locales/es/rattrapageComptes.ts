import type fr from '../fr/rattrapageComptes'
import type { Structure } from '../../types'

/** Espagnol — espace « rattrapageComptes » (backlog § BL.2), traduit depuis le français. */
const rattrapageComptes: Structure<typeof fr> = {
  rattacherVosLignesAUn: "Asocie sus líneas a una cuenta",
  chaqueLigneFinanciereDoitDesormais: "Cada línea financiera debe ahora estar asociada a una cuenta (los inmuebles, un vehículo u otro bien quedan exentos). Elija una cuenta existente o cree una para cada una de las líneas de abajo.",
  toutesVosLignesSontDesormais: "Todas sus líneas están ya asociadas a una cuenta.",
  compte: "Cuenta",
  choisir: "— Elegir —",
  nouveauCompte: "+ Nueva cuenta...",
  nomDuNouveauCompte: "Nombre de la nueva cuenta",
  peaCto: "PEA, CTO...",
  etablissement: "Entidad",
  valider: "Validar",
  chargement: "Cargando…",
  continuer: "Continuar",
  ariaComptePour: "Cuenta para {ticker}",
  ariaNomNouveauComptePour: "Nombre de la nueva cuenta para {ticker}",
  ariaEtablissementPour: "Entidad para {ticker}",
}

export default rattrapageComptes
