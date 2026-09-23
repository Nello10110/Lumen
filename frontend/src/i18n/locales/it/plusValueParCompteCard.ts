import type fr from '../fr/plusValueParCompteCard'
import type { Structure } from '../../types'

/** Italien — espace « plusValueParCompteCard » (backlog § BL.2), traduit depuis le français. */
const plusValueParCompteCard: Structure<typeof fr> = {
  plusValueParCompte: "Plusvalenza per conto",
  rienAComparerPourL: "Niente da confrontare per ora.",
  ceComparatifPorteSurLes: "Questo confronto riguarda le righe con un prezzo di carico noto (azioni, fondi, immobili...): un conto corrente o un libretto non ne hanno.",
  plusValueLatenteValeurActuelle: "Plusvalenza latente (valore attuale meno prezzo di carico) per conto: permette di individuare a colpo d’occhio i conti che spingono il patrimonio in alto o in basso.",
  plusValue: "Plusvalenza",
  moinsValue: "Minusvalenza",
  compte: "Conto",
  valeur: "Valore",
  moyenneDesRendementsAnnualisesXirr: "Media dei rendimenti annualizzati (XIRR) di ogni riga del conto, ponderata per il valore attuale: indicativa, non un calcolo flusso per flusso a livello di conto.",
  rendementAnnualise: "Rendimento annualizzato",
  pasDeValorisationConnuePour: "Nessuna valutazione nota per questo conto (posizioni valutate al costo, in mancanza di quotazione).",
}

export default plusValueParCompteCard
