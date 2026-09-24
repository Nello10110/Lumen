import type fr from '../fr/partagePublicPage'
import type { Structure } from '../../types'

/** Allemand — espace « partagePublicPage » (backlog § BL.2), traduit depuis le français. */
const partagePublicPage: Structure<typeof fr> = {
  patrimoinePartage: "Geteiltes Vermögen",
  consultation: "Ansicht",
  codeDAccesRequis: "Zugangscode erforderlich",
  code: "Code",
  verification: "Wird geprüft...",
  acceder: "Zugreifen",
  aucuneDonnee: "Keine Daten.",
  patrimoineNet: "Nettovermögen",
  actifsTotaux: "Gesamtvermögen",
  passifs: "Verbindlichkeiten",
  expositionConsolidee: "Konsolidiertes Exposure",
  plusGrosseLigne: "Größte Position",
  top5Lignes: "Top-5-Positionen",
  premiereZone: "Größte Region",
  geographique: "Geografisch",
  parClasseDActif: "Nach Anlageklasse",
  rentabilite: "Rendite",
  gainPerteTotal: "Gesamtgewinn/-verlust",
  rendementSimple: "Einfache Rendite",
  rendementAnnualise: "Annualisierte Rendite",
  entrees: "Einnahmen",
  sorties: "Ausgaben",
  disponible: "Verfügbar",
  vueEnLectureSeuleGeneree: "Schreibgeschützte Ansicht, erstellt von Lumen.",
}

export default partagePublicPage
