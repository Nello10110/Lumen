import type fr from '../fr/rattrapageComptes'
import type { Structure } from '../../types'

/** Allemand — espace « rattrapageComptes » (backlog § BL.2), traduit depuis le français. */
const rattrapageComptes: Structure<typeof fr> = {
  rattacherVosLignesAUn: "Ordnen Sie Ihre Positionen einem Konto zu",
  chaqueLigneFinanciereDoitDesormais: "Jede Finanzposition muss nun einem Konto zugeordnet sein (Immobilien, ein Fahrzeug oder ein anderes Gut sind ausgenommen). Wählen Sie für jede der folgenden Positionen ein bestehendes Konto oder legen Sie eines an.",
  toutesVosLignesSontDesormais: "Alle Ihre Positionen sind jetzt einem Konto zugeordnet.",
  compte: "Konto",
  choisir: "— Auswählen —",
  nouveauCompte: "+ Neues Konto...",
  nomDuNouveauCompte: "Name des neuen Kontos",
  peaCto: "PEA, CTO...",
  etablissement: "Institut",
  valider: "Bestätigen",
  chargement: "Wird geladen…",
  continuer: "Weiter",
  ariaComptePour: "Konto für {ticker}",
  ariaNomNouveauComptePour: "Name des neuen Kontos für {ticker}",
  ariaEtablissementPour: "Institut für {ticker}",
}

export default rattrapageComptes
