import type fr from '../fr/dashboardPage'
import type { Structure } from '../../types'

/** Allemand — espace « dashboardPage » (backlog § BL.2), traduit depuis le français. */
const dashboardPage: Structure<typeof fr> = {
  tableauDeBord: "Übersicht",
  actualisation: "Aktualisierung...",
  actualiser: "Aktualisieren",
  aucunePositionDansLePortefeuille: "Keine Position im Portfolio. Beginne damit,",
  importerTonPortefeuille: "dein Portfolio zu importieren",
  actualiserLesCours: "Kurse aktualisieren",
  repartitionsRentabiliteQualiteDesDonnees: "Aufteilungen, Rendite, Datenqualität und Erträge haben einen eigenen Bildschirm:",
  voirLAnalyseDetaillee: "zur detaillierten Analyse",
  coursNonActualises: { one: "Deine Kurse wurden seit {n} Tag nicht aktualisiert — jetzt aktualisieren?", other: "Deine Kurse wurden seit {n} Tagen nicht aktualisiert — jetzt aktualisieren?" },
}

export default dashboardPage
