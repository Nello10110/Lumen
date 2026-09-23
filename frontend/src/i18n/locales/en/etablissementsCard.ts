import type fr from '../fr/etablissementsCard'
import type { Structure } from '../../types'

/** Anglais — espace « etablissementsCard » (backlog § BL.2), traduit depuis le français. */
const etablissementsCard: Structure<typeof fr> = {
  banquesEtCourtiersDeclaresUne: "Banks and brokers, declared once, reused to group your accounts on the",
  comptes: "Accounts",
  exCaisseDEpargneContenant: "screen (e.g. “Caisse d’Épargne” holding a current account and a life insurance). Deleting an institution never touches the accounts linked to it — they simply fall back into “No institution”.",
  aucunEtablissementDeclare: "No institution declared.",
  modifier: "Edit",
  supprimer: "Delete",
  nom: "Name",
  caisseDEpargne: "Caisse d'Épargne",
  ajouter: "Add",
  etablissements: "Institutions",
}

export default etablissementsCard
