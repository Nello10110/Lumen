import type fr from '../fr/revenusPassifsCard'
import type { Structure } from '../../types'

/** Italien — espace « revenusPassifsCard » (backlog § BL.2), traduit depuis le français. */
const revenusPassifsCard: Structure<typeof fr> = {
  revenusPassifsProjetes12Mois: "Redditi passivi previsti (12 mesi)",
  aucunRevenuPassifDetecte: "Nessun reddito passivo rilevato.",
  renseigneUnLoyerSurUne: "Inserisci un affitto in una scheda immobiliare, un tasso su un risparmio, o importa uno storico con dividendi incassati.",
  projectionAnnuelle: "Proiezione annua",
  projectionMensuelle: "Proiezione mensile",
  certain: "Certo",
  loyersNets: "Affitti netti",
  interetsDeLivrets: "Interessi dei libretti",
  estime12DerniersMoisExtrapoles: "Stimato (ultimi 12 mesi estrapolati)",
  dividendes: "Dividendi",
  interetsDeCourtage: "Interessi del broker",
  laPartCertaineReposeSur: "La parte «certa» si basa su importi già noti (affitto, tasso dichiarato). La parte «stimata» estrapola gli ultimi 12 mesi realmente incassati: mai una promessa per i prossimi 12.",
}

export default revenusPassifsCard
