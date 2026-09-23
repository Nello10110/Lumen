import type fr from '../fr/scorePatrimonialCard'
import type { Structure } from '../../types'

/** Italien — espace « scorePatrimonialCard » (backlog § BL.2), traduit depuis le français. */
const scorePatrimonialCard: Structure<typeof fr> = {
  scorePatrimonial: "Punteggio patrimoniale",
  scoreGlobal: "Punteggio complessivo",
  commentCEstCalcule: "Come viene calcolato?",
  duScore: "% del punteggio)",
}

export default scorePatrimonialCard
