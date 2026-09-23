import type fr from '../fr/revenusPassifsCard'
import type { Structure } from '../../types'

/** Allemand — espace « revenusPassifsCard » (backlog § BL.2), traduit depuis le français. */
const revenusPassifsCard: Structure<typeof fr> = {
  revenusPassifsProjetes12Mois: "Prognostizierte passive Erträge (12 Monate)",
  aucunRevenuPassifDetecte: "Keine passiven Erträge erkannt.",
  renseigneUnLoyerSurUne: "Erfasse eine Miete in einer Immobilien-Detailansicht, einen Zinssatz bei einem Sparprodukt oder importiere eine Historie mit erhaltenen Dividenden.",
  projectionAnnuelle: "Jährliche Prognose",
  projectionMensuelle: "Monatliche Prognose",
  certain: "Sicher",
  loyersNets: "Nettomieten",
  interetsDeLivrets: "Sparzinsen",
  estime12DerniersMoisExtrapoles: "Geschätzt (letzte 12 Monate hochgerechnet)",
  dividendes: "Dividenden",
  interetsDeCourtage: "Zinsen des Brokers",
  laPartCertaineReposeSur: "Der „sichere“ Teil beruht auf bereits bekannten Beträgen (Miete, erfasster Zinssatz). Der „geschätzte“ Teil rechnet die tatsächlich erhaltenen letzten 12 Monate hoch — nie ein Versprechen für die nächsten 12.",
}

export default revenusPassifsCard
