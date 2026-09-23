import type fr from '../fr/patrimoineNetCard'
import type { Structure } from '../../types'

/** Italien — espace « patrimoineNetCard » (backlog § BL.2), traduit depuis le français. */
const patrimoineNetCard: Structure<typeof fr> = {
  patrimoineNet: "Patrimonio netto",
  patrimoineBrut: "Patrimonio lordo",
  patrimoineFinancier: "Patrimonio finanziario",
  foyer: "Nucleo",
  detenteurSelectionne: "Titolare selezionato",
  financier: "Finanziario",
  actionsEtfCryptoObligations: "Azioni, ETF, cripto, obbligazioni",
  immobilierEpargne: "Immobili e risparmio",
  biensAssurancesVieLivrets: "Immobili, assicurazioni vita, libretti",
  emprunts: "Prestiti",
  capitalRestantDu: "Capitale residuo",
  parTypeDInvestissement: "Per tipo di investimento",
  legendeFinancier: "portafoglio monitorato, esclusi immobili/risparmio/debiti",
  legendeBrut: "patrimonio lordo monitorato: immobili/risparmio valutati ai loro ultimi punti noti, talvolta distanziati",
  legendeNet: "patrimonio netto monitorato: immobili/risparmio valutati ai loro ultimi punti noti, talvolta distanziati",
}

export default patrimoineNetCard
