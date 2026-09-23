import type fr from '../fr/expositionConsolideeCard'
import type { Structure } from '../../types'

/** Italien — espace « expositionConsolideeCard » (backlog § BL.2), traduit depuis le français. */
const expositionConsolideeCard: Structure<typeof fr> = {
  expositionConsolideeTousActifs: "Esposizione consolidata: tutte le attività",
  aucunActifValorise: "Nessuna attività valutata.",
  importeUnHistoriqueDeTransactions: "Importa uno storico delle operazioni o inserisci un’attività manualmente per vedere l’esposizione consolidata.",
  plusGrosseLigne: "Riga più grande",
  top5Lignes: "Prime 5 righe",
  duPatrimoineTotal: "del patrimonio totale",
  premiereZoneGeographique: "Prima area geografica",
  valeurTotaleConsolidee: "Valore totale consolidato",
  netteDesEmpruntsRattachesA: " (al netto dei prestiti collegati a ogni attività)",
  valeurBrute: " (valore lordo)",
  repartitionGeographiqueConsolidee: "Ripartizione geografica consolidata",
  repartitionParClasseDActif: "Ripartizione per classe di attività",
  partDeclaree: "Il {pct}% di questo valore (immobili/risparmio inseriti manualmente) ha un’area geografica dichiarata, non misurata.",
}

export default expositionConsolideeCard
