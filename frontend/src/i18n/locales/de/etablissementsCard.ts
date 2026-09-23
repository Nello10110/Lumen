import type fr from '../fr/etablissementsCard'
import type { Structure } from '../../types'

/** Allemand — espace « etablissementsCard » (backlog § BL.2), traduit depuis le français. */
const etablissementsCard: Structure<typeof fr> = {
  banquesEtCourtiersDeclaresUne: "Banken und Broker, einmal erfasst und wiederverwendet, um deine Konten auf dem Bildschirm",
  comptes: "Konten",
  exCaisseDEpargneContenant: "zu gruppieren (z. B. „Caisse d’Épargne“ mit einem Girokonto und einer Lebensversicherung). Das Löschen eines Instituts berührt nie die zugehörigen Konten — sie landen einfach unter „Ohne Institut“.",
  aucunEtablissementDeclare: "Kein Institut erfasst.",
  modifier: "Bearbeiten",
  supprimer: "Löschen",
  nom: "Name",
  caisseDEpargne: "Caisse d'Épargne",
  ajouter: "Hinzufügen",
  etablissements: "Institute",
}

export default etablissementsCard
