import type fr from '../fr/repartitionGlobale'
import type { Structure } from '../../types'

/** Allemand — espace « repartitionGlobale » (§ BN.1, lot 3), traduit depuis le français. */
const repartitionGlobale: Structure<typeof fr> = {
  badge: "Nicht aufgeteilt",
  badgeAide: "Diese Position hat keine Anteile: Sie zählt für den ganzen Haushalt, aber kein Mitglied sieht sie in seiner Ansicht.",
  repartir: "Aufteilen",
  repartirAria: "„{nom}“ auf die Haushaltsmitglieder aufteilen",
  bandeau: {
    foyer: {
      one: "{n} Position ist noch nicht auf die Haushaltsmitglieder aufgeteilt.",
      other: "{n} Positionen sind noch nicht auf die Haushaltsmitglieder aufgeteilt.",
    },
    vueMembre: "Ansicht von {nom}: Die Werte entsprechen den Anteilen.",
    nonComptees: {
      one: "{n} nicht aufgeteilte Position wird nicht mitgezählt.",
      other: "{n} nicht aufgeteilte Positionen werden nicht mitgezählt.",
    },
    toutAttribuer: "Alles zuweisen",
  },
  modale: {
    titre: "Alles zuweisen",
    introduction: "Wendet dieselbe Aufteilung auf alle Positionen an, die noch keine haben. Bereits aufgeteilte Positionen bleiben unverändert, und bis zu Ihrer Bestätigung wird nichts geändert.",
    apercuTitre: "Betroffene Positionen",
    actifs: { one: "{n} Vermögenswert", other: "{n} Vermögenswerte" },
    prets: { one: "{n} Kredit", other: "{n} Kredite" },
    et: "und",
    rienARepartir: "Alle Positionen sind bereits aufgeteilt.",
    choix: "Anzuwendende Aufteilung",
    appliquer: "Zuweisen",
    enCours: "Wird zugewiesen …",
    annuler: "Abbrechen",
    fermer: "Schließen",
    termine: "Erledigt: {lignes} haben jetzt Anteile.",
  },
  prorata: "{pct} von {valeur}",
  repartirModale: {
    titre: "„{nom}“ aufteilen",
    introduction: "Legt fest, wem diese Position gehört und mit welchem Anteil.",
    enregistrer: "Aufteilung speichern",
    enregistree: "Aufteilung gespeichert.",
    fermer: "Schließen",
  },
  quiLeDetient: {
    titre: "Wem es gehört",
    resumeParts: "{nom} {pct}",
    resumeAucune: "kein Anteil (die Position bleibt beim ganzen Haushalt)",
    aide: "Jedes Haushaltsmitglied hält einen Anteil dieser Position; ohne Aufteilung erscheint sie in keiner Mitgliederansicht.",
  },
  importQuestion: {
    titre: "Welchem Mitglied gehören diese Positionen?",
    aide: "Diese Aufteilung gilt für die Positionen, die dieser Import anlegt. Bereits vorhandene behalten ihre Anteile.",
    dernierChoix: "Ihre letzte Wahl für diesen Haushalt wird übernommen.",
    invalide: "Vervollständigen Sie die Aufteilung (100 %), um zu importieren.",
  },
  homonyme: {
    titre: "Ein Konto „{nom}“ existiert bereits",
    detenuPar: "Es gehört {membres}. Der Name eines Kontos ist im Haushalt eindeutig.",
    sansMembre: "Der Name eines Kontos ist im Haushalt eindeutig.",
    pourQui: "Für welches Mitglied?",
    ajouter: "{nom} zu diesem Konto hinzufügen",
    renommer: "In „{nouveau}“ umbenennen",
    ajouteIntro: "{nom} wird zu diesem Konto hinzugefügt: Passen Sie die Anteile an und speichern Sie.",
    separateur: "—",
  },
  avisFoyerEntier: {
    analyse: "Dieser Bildschirm zeigt den ganzen Haushalt: Die Ansicht von {nom} gilt hier nicht (der Tab Entwicklung hat eine eigene Mitgliederauswahl).",
    rapport: "Dieser Bericht betrifft den ganzen Haushalt: Die Ansicht von {nom} gilt hier nicht.",
  },
  nonRepartiCompte: "Mindestens eine Position dieses Kontos ist nicht auf die Haushaltsmitglieder aufgeteilt — zum Aufteilen anklicken",
  membresDuCompte: "Haushaltsmitglieder dieses Kontos: {membres}",
}

export default repartitionGlobale
