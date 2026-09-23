import type fr from '../fr/etablissementsCard'
import type { Structure } from '../../types'

/** Italien — espace « etablissementsCard » (backlog § BL.2), traduit depuis le français. */
const etablissementsCard: Structure<typeof fr> = {
  banquesEtCourtiersDeclaresUne: "Banche e broker, indicati una volta e riutilizzati per raggruppare i tuoi conti nella schermata",
  comptes: "Conti",
  exCaisseDEpargneContenant: "(es. «Caisse d’Épargne» con un conto corrente e un’assicurazione vita). Eliminare un istituto non tocca mai i conti collegati: ricadono semplicemente in «Senza istituto».",
  aucunEtablissementDeclare: "Nessun istituto indicato.",
  modifier: "Modifica",
  supprimer: "Elimina",
  nom: "Nome",
  caisseDEpargne: "Caisse d'Épargne",
  ajouter: "Aggiungi",
  etablissements: "Istituti",
}

export default etablissementsCard
