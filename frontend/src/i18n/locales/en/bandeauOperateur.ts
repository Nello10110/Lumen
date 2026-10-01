import type fr from '../fr/bandeauOperateur'
import type { Structure } from '../../types'

/** Anglais — espace « bandeauOperateur » (backlog § BK.2d), traduit depuis le français. */
const bandeauOperateur: Structure<typeof fr> = {
  titre: "Create the operator account",
  texte: "The operator administers the installation — creating, suspending or deleting households, setting the scheduled tasks and the SSO button logo — without ever seeing any assets. It is a separate account from yours, belonging to no household. Optional while you are the only one on this installation; needed to host other households.",
  ouvrir: "Create the operator…",
}

export default bandeauOperateur
