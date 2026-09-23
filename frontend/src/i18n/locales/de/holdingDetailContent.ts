import type fr from '../fr/holdingDetailContent'
import type { Structure } from '../../types'

/** Allemand — espace « holdingDetailContent » (backlog § BL.2), traduit depuis le français. */
const holdingDetailContent: Structure<typeof fr> = {
  residencePrincipale: "Hauptwohnsitz",
  depuisLAchat: "seit Kauf",
  sectionsDeLaFiche: "Abschnitte der Detailansicht",
  quantite: "Menge",
  prixDeRevient: "Einstandspreis",
  prixActuel: "Aktueller Kurs",
  valeur: "Wert",
  depuisAchat: "Seit Kauf",
  rendementAnnualise: "Annualisierte Rendite",
  indisponibleDetentionTropRecenteOu: "nicht verfügbar: Haltedauer zu kurz oder seit dem Kauf kein Verkauf/Ertrag bekannt",
  secteur: "Sektor",
  pays: "Land",
  emetteurResumeFrais: "Emittent, Zusammenfassung & Gebühren",
  emetteur: "Emittent:",
  informationsNonDisponibles: "Informationen nicht verfügbar.",
  fraisDeGestionAnnuels: "Jährliche Verwaltungsgebühren",
  fraisDeTransactionPayesCumules: "Gezahlte Transaktionsgebühren (kumuliert)",
  repartitionGeographique: "Geografische Aufteilung",
  repartitionSectorielle: "Sektorale Aufteilung",
  repartitionGeographiqueDetaillee: "Detaillierte geografische Aufteilung",
  repartitionSectorielleDetaillee: "Detaillierte sektorale Aufteilung",
  compositionEnActions10Plus: "Aktienbestand (die 10 größten Positionen des Fonds)",
  action: "Aktie",
  proportion: "Anteil",
  ongletApercu: "Überblick",
  ongletAnalyse: "Analyse",
  ongletParametres: "Einstellungen",
}

export default holdingDetailContent
