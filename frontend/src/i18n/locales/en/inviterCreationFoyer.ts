import type fr from '../fr/inviterCreationFoyer'
import type { Structure } from '../../types'

/** Anglais — espace « inviterCreationFoyer » (backlog § BK.2d), traduit depuis le français. */
const inviterCreationFoyer: Structure<typeof fr> = {
  titre: "Invite someone close to create their household",
  intro: "Generate a “create your household” link to send to the person: they create their account there — or use the one they already have — and their own household, which they will own. They do not join yours. The link can be used once and expires after the chosen period.",
}

export default inviterCreationFoyer
