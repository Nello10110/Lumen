import type fr from '../fr/repartitionMembres'
import type { Structure } from '../../types'

/** Allemand — espace « repartitionMembres » (backlog § BL.2), traduit depuis le français. */
const repartitionMembres: Structure<typeof fr> = {
  raccourcis: "Aufteilungs-Kurzbefehle",
  partsEgales: "Zu gleichen Teilen",
  toutPour: "100 % {nom}",
  partDe: "Anteil von {nom} (%)",
  curseurDe: "Anteil von {nom}, Schieberegler",
  moins: "1 % von {nom} abziehen",
  plus: "1 % zu {nom} hinzufügen",
  partDetenue: "Gehaltener Anteil:",
  partNette: "Nettoanteil:",
  aidePartDetenue: "Wert der Immobilie, der auf dieses Mitglied entfällt, anteilig, OHNE Abzug des Kredits.",
  aidePartNette: "Gehaltener Anteil MINUS Anteil an der Restschuld des verknüpften Kredits.",
  total: "Summe: {total}",
  complet: "vollständig",
  aucunePart: "Kein Anteil zugewiesen: Ohne Aufteilung bleibt alles beim ganzen Haushalt.",
  manque: "Es fehlen {ecart} — zu {nom} hinzufügen?",
  trop: "Es sind {ecart} zu viel — bei {nom} abziehen?",
  manqueSimple: "Es fehlen {ecart} bis 100 %.",
  tropSimple: "Es sind {ecart} zu viel: Die Summe muss 100 % ergeben.",
  ajouterA: "Zu {nom} hinzufügen",
  retirerA: "Bei {nom} abziehen",
  suitPret: "Der Kredit folgt derselben Aufteilung.",
}

export default repartitionMembres
