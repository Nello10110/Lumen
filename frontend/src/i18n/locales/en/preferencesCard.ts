import type fr from '../fr/preferencesCard'
import type { Structure } from '../../types'

/** Anglais — espace « preferencesCard » (backlog § BL.2), traduit depuis le français. */
const preferencesCard: Structure<typeof fr> = {
  methodeDeCalculDuCout: "Cost basis method",
  attentionChangerDeMethodeRecalcule: "Warning: changing the method immediately recalculates the cost basis and realized gains of the WHOLE portfolio.",
  declarationDePatrimoine: "Statement of assets",
  tauxDImpositionSaisiIci: "Tax rate entered here, used as is in the statement of assets (Export tab) — the app performs no tax calculation; this value is the one you enter.",
  tauxDImposition: "Tax rate",
  nonRenseigne: "not specified",
  comparaisonPatrimoniale: "Wealth comparison",
  sertUniquementAChoisirLa: "Only used to choose the right age bracket for comparison with the French median wealth (Analysis screen) — never stored or used elsewhere.",
  anneeDeNaissance: "Year of birth",
  nonRenseignee: "not specified",
  coutMoyenPondere: "Weighted average cost",
  fifo: "FIFO (first in, first out)",
  coutMoyenPondereDescription: "Each sale removes the average cost of the WHOLE position at the time of sale: the cost basis stays a single average, whatever the age of the securities sold. The app’s default method.",
  fifoDescription: "Each sale first consumes the oldest securities bought: the cost removed is that of those securities, not an average. The remaining cost basis then reflects only the most recent lots.",
  positionsRecalculees: { one: "{n} portfolio position recalculated with the new method.", other: "{n} portfolio positions recalculated with the new method." },
}

export default preferencesCard
