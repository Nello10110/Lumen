import type fr from '../fr/metriquesAvanceesCard'
import type { Structure } from '../../types'

/** Italien — espace « metriquesAvanceesCard » (backlog § BL.2), traduit depuis le français. */
const metriquesAvanceesCard: Structure<typeof fr> = {
  metriquesDePerformanceAvancees: "Metriche di rendimento avanzate",
  leRendementAnnualiseAfficheCi: "Il rendimento annualizzato mostrato sopra (ponderato per il denaro, XIRR) giudica la Sua decisione: quando e quanto ha versato. Il",
  twr: "TWR",
  timeWeightedCiDessousNeutralise: "(ponderato nel tempo, qui sotto) neutralizza l’effetto dei Suoi versamenti per giudicare l’investimento in sé: due persone investite nello stesso portafoglio nello stesso momento hanno lo stesso TWR, anche con importi diversi.",
  historiqueInsuffisantPourCalculerCes: "Storico insufficiente per calcolare queste metriche.",
  performanceDuPlacementCumulee: "Rendimento dell’investimento (cumulato)",
  twrCumule: "TWR cumulato",
  performanceDuPlacementParAn: "Rendimento dell’investimento (annuo)",
  twrAnnualise: "TWR annualizzato",
  regulariteDuParcours: "Regolarità del percorso",
  volatiliteAnnualisee: "Volatilità annualizzata",
  pireChuteEssuyee: "Peggior calo subito",
  perteMaximaleDrawdown: "Perdita massima (drawdown)",
  nonRecupereACeJour: "non recuperato a oggi",
  comparaisonAUnIndice: "Confronto con un indice",
  choisirUnIndiceDeReference: "Scegli un indice di riferimento",
  choisisUnIndicePourComparer: "Scegli un indice per confrontare l’andamento del tuo portafoglio (in %, dall’inizio del monitoraggio) con quello dell’indice nello stesso periodo.",
  recupereEnSemaines: { one: "recuperato in {n} settimana", other: "recuperato in {n} settimane" },
}

export default metriquesAvanceesCard
