import type fr from '../fr/expositionConsolideeCard'
import type { Structure } from '../../types'

/** Espagnol — espace « expositionConsolideeCard » (backlog § BL.2), traduit depuis le français. */
const expositionConsolideeCard: Structure<typeof fr> = {
  expositionConsolideeTousActifs: "Exposición consolidada: todos los activos",
  aucunActifValorise: "Ningún activo valorado.",
  importeUnHistoriqueDeTransactions: "Importa un historial de operaciones o introduce un activo manualmente para ver la exposición consolidada.",
  plusGrosseLigne: "Mayor línea",
  top5Lignes: "5 mayores líneas",
  duPatrimoineTotal: "del patrimonio total",
  premiereZoneGeographique: "Primera zona geográfica",
  valeurTotaleConsolidee: "Valor total consolidado",
  netteDesEmpruntsRattachesA: " (neto de los préstamos vinculados a cada activo)",
  valeurBrute: " (valor bruto)",
  repartitionGeographiqueConsolidee: "Reparto geográfico consolidado",
  repartitionParClasseDActif: "Reparto por clase de activo",
  partDeclaree: "El {pct} % de este valor (inmuebles/ahorro introducidos manualmente) tiene una zona geográfica declarada, no medida.",
  pctDuPatrimoine: "{pct} del patrimonio",
}

export default expositionConsolideeCard
