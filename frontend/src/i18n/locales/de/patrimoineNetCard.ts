import type fr from '../fr/patrimoineNetCard'
import type { Structure } from '../../types'

/** Allemand — espace « patrimoineNetCard » (backlog § BL.2), traduit depuis le français. */
const patrimoineNetCard: Structure<typeof fr> = {
  patrimoineNet: "Nettovermögen",
  patrimoineBrut: "Bruttovermögen",
  patrimoineFinancier: "Finanzvermögen",
  foyer: "Haushalt",
  detenteurSelectionne: "Ausgewählter Inhaber",
  financier: "Finanziell",
  actionsEtfCryptoObligations: "Aktien, ETFs, Krypto, Anleihen",
  immobilierEpargne: "Immobilien & Ersparnisse",
  biensAssurancesVieLivrets: "Immobilien, Lebensversicherungen, Sparkonten",
  emprunts: "Kredite",
  capitalRestantDu: "Restschuld",
  parTypeDInvestissement: "Nach Anlageart",
  legendeFinancier: "erfasstes Portfolio, ohne Immobilien/Ersparnisse/Schulden",
  legendeBrut: "erfasstes Bruttovermögen — Immobilien/Ersparnisse zu ihren letzten bekannten, teils weit auseinanderliegenden Werten",
  legendeNet: "erfasstes Nettovermögen — Immobilien/Ersparnisse zu ihren letzten bekannten, teils weit auseinanderliegenden Werten",
}

export default patrimoineNetCard
