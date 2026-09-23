import type fr from '../fr/expositionConsolideeCard'
import type { Structure } from '../../types'

/** Allemand — espace « expositionConsolideeCard » (backlog § BL.2), traduit depuis le français. */
const expositionConsolideeCard: Structure<typeof fr> = {
  expositionConsolideeTousActifs: "Konsolidiertes Exposure — alle Vermögenswerte",
  aucunActifValorise: "Kein bewerteter Vermögenswert.",
  importeUnHistoriqueDeTransactions: "Importiere eine Transaktionshistorie oder erfasse einen Vermögenswert manuell, um das konsolidierte Exposure zu sehen.",
  plusGrosseLigne: "Größte Position",
  top5Lignes: "Top 5 Positionen",
  duPatrimoineTotal: "des Gesamtvermögens",
  premiereZoneGeographique: "Wichtigste geografische Zone",
  valeurTotaleConsolidee: "Konsolidierter Gesamtwert",
  netteDesEmpruntsRattachesA: " (abzüglich der jedem Vermögenswert zugeordneten Kredite)",
  valeurBrute: " (Bruttowert)",
  repartitionGeographiqueConsolidee: "Konsolidierte geografische Aufteilung",
  repartitionParClasseDActif: "Aufteilung nach Anlageklasse",
  partDeclaree: "{pct} % dieses Werts (manuell erfasste Immobilien/Ersparnisse) haben eine angegebene, keine gemessene geografische Zone.",
}

export default expositionConsolideeCard
