import type fr from '../fr/coutGestionCard'
import type { Structure } from '../../types'

/** Anglais — espace « coutGestionCard » (backlog § BL.2), traduit depuis le français. */
const coutGestionCard: Structure<typeof fr> = {
  coutDeGestionAnnuelEstime: "Estimated annual management cost (funds/ETFs)",
  sur: "out of",
  deFondsEtfDetenusDont: "of funds/ETFs held, of which",
  avecDesFraisDeGestion: "% with known management fees.",
  les: "The",
  restantsNOntPasEncore: "remaining do not have known management fees yet (fetched once per fund, as refreshes go by) — the actual cost is therefore underestimated until coverage reaches 100%.",
}

export default coutGestionCard
