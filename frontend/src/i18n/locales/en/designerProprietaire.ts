import type fr from '../fr/designerProprietaire'
import type { Structure } from '../../types'

/** Anglais — espace « designerProprietaire » (backlog § BK.2d), traduit depuis le français. */
const designerProprietaire: Structure<typeof fr> = {
  titre: "New owner of the household {foyer}",
  aucunMembre: "This household has no member to appoint: only a member can become the owner (a guest cannot).",
  explication: "Appoint a member of the household as owner — useful when the owner is gone. The current owner, if any, becomes a regular member.",
  membreLabel: "Member",
  choisir: "Choose a member…",
  annuler: "Cancel",
  designer: "Appoint as owner",
}

export default designerProprietaire
