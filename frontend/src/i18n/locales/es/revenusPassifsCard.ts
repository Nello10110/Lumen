import type fr from '../fr/revenusPassifsCard'
import type { Structure } from '../../types'

/** Espagnol — espace « revenusPassifsCard » (backlog § BL.2), traduit depuis le français. */
const revenusPassifsCard: Structure<typeof fr> = {
  revenusPassifsProjetes12Mois: "Ingresos pasivos proyectados (12 meses)",
  aucunRevenuPassifDetecte: "No se ha detectado ningún ingreso pasivo.",
  renseigneUnLoyerSurUne: "Indica un alquiler en una ficha inmobiliaria, un tipo en un ahorro, o importa un historial con dividendos cobrados.",
  projectionAnnuelle: "Proyección anual",
  projectionMensuelle: "Proyección mensual",
  certain: "Seguro",
  loyersNets: "Alquileres netos",
  interetsDeLivrets: "Intereses de libretas",
  estime12DerniersMoisExtrapoles: "Estimado (últimos 12 meses extrapolados)",
  dividendes: "Dividendos",
  interetsDeCourtage: "Intereses del bróker",
  laPartCertaineReposeSur: "La parte «segura» se basa en importes ya conocidos (alquiler, tipo declarado). La parte «estimada» extrapola los últimos 12 meses realmente cobrados: nunca es una promesa para los 12 siguientes.",
}

export default revenusPassifsCard
