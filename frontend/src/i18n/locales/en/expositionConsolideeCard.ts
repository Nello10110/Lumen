import type fr from '../fr/expositionConsolideeCard'
import type { Structure } from '../../types'

/** Anglais — espace « expositionConsolideeCard » (backlog § BL.2), traduit depuis le français. */
const expositionConsolideeCard: Structure<typeof fr> = {
  expositionConsolideeTousActifs: "Consolidated exposure — all assets",
  aucunActifValorise: "No valued asset.",
  importeUnHistoriqueDeTransactions: "Import a transaction history or enter an asset manually to see the consolidated exposure.",
  plusGrosseLigne: "Largest line",
  top5Lignes: "Top 5 lines",
  duPatrimoineTotal: "of total wealth",
  premiereZoneGeographique: "Top geographic area",
  valeurTotaleConsolidee: "Total consolidated value",
  netteDesEmpruntsRattachesA: " (net of the loans linked to each asset)",
  valeurBrute: " (gross value)",
  repartitionGeographiqueConsolidee: "Consolidated geographic allocation",
  repartitionParClasseDActif: "Allocation by asset class",
  partDeclaree: "{pct}% of this value (real estate/savings entered manually) has a declared, not measured, geographic area.",
  pctDuPatrimoine: "{pct} of total wealth",
}

export default expositionConsolideeCard
