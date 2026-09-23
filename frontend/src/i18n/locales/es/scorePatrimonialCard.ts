import type fr from '../fr/scorePatrimonialCard'
import type { Structure } from '../../types'

/** Espagnol — espace « scorePatrimonialCard » (backlog § BL.2), traduit depuis le français. */
const scorePatrimonialCard: Structure<typeof fr> = {
  scorePatrimonial: "Puntuación patrimonial",
  scoreGlobal: "Puntuación global",
  commentCEstCalcule: "¿Cómo se calcula?",
  duScore: "% de la puntuación)",
}

export default scorePatrimonialCard
