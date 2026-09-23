import type fr from '../fr/scorePatrimonialCard'
import type { Structure } from '../../types'

/** Allemand — espace « scorePatrimonialCard » (backlog § BL.2), traduit depuis le français. */
const scorePatrimonialCard: Structure<typeof fr> = {
  scorePatrimonial: "Vermögenswert-Score",
  scoreGlobal: "Gesamtwert",
  commentCEstCalcule: "Wie wird er berechnet?",
  duScore: "% des Werts)",
}

export default scorePatrimonialCard
