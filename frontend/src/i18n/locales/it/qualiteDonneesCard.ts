import type fr from '../fr/qualiteDonneesCard'
import type { Structure } from '../../types'

/** Italien — espace « qualiteDonneesCard » (backlog § BL.2), traduit depuis le français. */
const qualiteDonneesCard: Structure<typeof fr> = {
  qualiteDesDonnees: "Qualità dei dati",
  estimeeParIndice: "Il {pct}% del valore del portafoglio ({valeur}) ha una ripartizione geografica stimata dall’indice seguito dal fondo, in mancanza di una composizione dettagliata.",
  nonCategorisee: "Il {pct}% del valore del portafoglio ({valeur}) non ha dati geografici disponibili e compare come «Non classificato».",
  sansCotation: "{valeur} ({pct}%) sono valutati al prezzo di carico in mancanza di quotazione disponibile: questo valore entra così com’è nel punteggio di diversificazione e negli importi di ribilanciamento in euro.",
}

export default qualiteDonneesCard
