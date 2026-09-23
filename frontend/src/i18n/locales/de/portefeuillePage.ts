import type fr from '../fr/portefeuillePage'
import type { Structure } from '../../types'

/** Allemand — espace « portefeuillePage » (backlog § BL.2), traduit depuis le français. */
const portefeuillePage: Structure<typeof fr> = {
  filtrerParCategorie: "Nach Kategorie filtern",
  filtrerParCompte: "Nach Konto filtern",
  tousLesComptes: "Alle Konten",
  sansCompte: "Ohne Konto",
  rafraichissement: "Aktualisierung...",
  portefeuille: "Portfolio",
  coursAJourAu: "Kurse aktuell zum",
  rallumerLesCours: "Kurse aktualisieren.",
  rafraichir: "Aktualisieren",
  ajouterUneLigne: "Zeile hinzufügen",
  unePositionBoursiereUnBien: "Eine Wertpapierposition, ein manuell bewerteter Vermögenswert (Immobilie, Ersparnisse, Fahrzeug) oder ein Kredit.",
  fermer: "Schließen",
  filtrer: "Filtern",
  filtrerLePortefeuille: "Portfolio filtern",
  ajoutezVotrePremiereLignePour: "Fügen Sie Ihre erste Zeile hinzu, um Ihr Vermögen zum Leuchten zu bringen.",
  aucunePositionNeCorrespondA: "Keine Position entspricht diesem Filter.",
  reinitialiserLesFiltres: "Filter zurücksetzen",
  performanceDesLignesAffichees: "Wertentwicklung der angezeigten Zeilen",
  supprimerCetteLigne: "Diese Zeile löschen?",
  laLigne: "Die Zeile",
  seraDefinitivementSupprimeeDuPortefeuille: "wird endgültig aus dem Portfolio entfernt.",
  annuler: "Abbrechen",
  suppression: "Wird gelöscht...",
  supprimer: "Löschen",
  rafraichissementProgression: "Aktualisierung... ({faites} / {total} Positionen)",
  nLignes: { one: "{n} Zeile", other: "{n} Zeilen" },
  tous: "Alle",
  voirNPositions: { one: "{n} Position anzeigen", other: "{n} Positionen anzeigen" },
}

export default portefeuillePage
