import type fr from '../fr/repartitionGlobale'
import type { Structure } from '../../types'

/** Italien — espace « repartitionGlobale » (§ BN.1, lot 3), traduit depuis le français. */
const repartitionGlobale: Structure<typeof fr> = {
  badge: "Non ripartito",
  badgeAide: "Questa voce non ha quote: conta per l’intero nucleo, ma nessun membro la vede nella propria vista.",
  repartir: "Ripartisci",
  repartirAria: "Ripartisci «{nom}» tra i membri del nucleo",
  bandeau: {
    foyer: {
      one: "{n} voce non è ancora ripartita tra i membri del nucleo.",
      other: "{n} voci non sono ancora ripartite tra i membri del nucleo.",
    },
    vueMembre: "Vista di {nom}: i valori sono proporzionali alle sue quote.",
    nonComptees: {
      one: "{n} voce non ripartita non è conteggiata.",
      other: "{n} voci non ripartite non sono conteggiate.",
    },
    toutAttribuer: "Assegna tutto",
  },
  modale: {
    titre: "Assegna tutto",
    introduction: "Applica la stessa ripartizione a tutte le voci che non ne hanno ancora una. Le voci già ripartite non cambiano e nulla viene modificato prima della conferma.",
    apercuTitre: "Voci interessate",
    actifs: { one: "{n} attività", other: "{n} attività" },
    prets: { one: "{n} prestito", other: "{n} prestiti" },
    et: "e",
    rienARepartir: "Tutte le voci sono già ripartite.",
    choix: "Ripartizione da applicare",
    appliquer: "Assegna",
    enCours: "Assegnazione in corso…",
    annuler: "Annulla",
    fermer: "Chiudi",
    termine: "Fatto: {lignes} hanno ora delle quote.",
  },
  prorata: "{pct} di {valeur}",
  repartirModale: {
    titre: "Ripartisci «{nom}»",
    introduction: "Definisce chi detiene questa voce e con quale quota.",
    enregistrer: "Salva la ripartizione",
    enregistree: "Ripartizione salvata.",
    fermer: "Chiudi",
  },
  quiLeDetient: {
    titre: "Chi lo detiene",
    resumeParts: "{nom} {pct}",
    resumeAucune: "nessuna quota (la voce resta all’intero nucleo)",
    aide: "Ogni membro del nucleo detiene una quota di questa voce; senza ripartizione, non compare nella vista di nessun membro.",
  },
  importQuestion: {
    titre: "A quale membro appartengono queste voci?",
    aide: "Questa ripartizione si applica alle voci create da questa importazione. Quelle già esistenti mantengono le loro quote.",
    dernierChoix: "Viene ripresa la tua ultima scelta per questo nucleo.",
    invalide: "Completa la ripartizione (100 %) per importare.",
  },
  homonyme: {
    titre: "Esiste già un conto «{nom}»",
    detenuPar: "È detenuto da {membres}. Il nome di un conto è univoco nel nucleo.",
    sansMembre: "Il nome di un conto è univoco nel nucleo.",
    pourQui: "Per quale membro?",
    ajouter: "Aggiungi {nom} a questo conto",
    renommer: "Rinomina in «{nouveau}»",
    ajouteIntro: "{nom} viene aggiunto a questo conto: regola le quote e salva.",
    separateur: "—",
  },
  avisFoyerEntier: {
    analyse: "Questa schermata mostra l’intero nucleo: la vista di {nom} non si applica qui (la scheda Evoluzione ha una propria scelta del membro).",
    rapport: "Questo rapporto riguarda l’intero nucleo: la vista di {nom} non si applica qui.",
  },
  nonRepartiCompte: "Almeno una voce di questo conto non è ripartita tra i membri del nucleo — clicca per ripartirla",
  membresDuCompte: "Membri del nucleo di questo conto: {membres}",
}

export default repartitionGlobale
