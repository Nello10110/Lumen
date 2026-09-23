import type fr from '../fr/scorePatrimonialCard'
import type { Structure } from '../../types'

/** Anglais — espace « scorePatrimonialCard » (backlog § BL.2), traduit depuis le français. */
const scorePatrimonialCard: Structure<typeof fr> = {
  scorePatrimonial: "Wealth score",
  scoreGlobal: "Overall score",
  commentCEstCalcule: "How is it calculated?",
  duScore: "% of the score)",
}

export default scorePatrimonialCard
