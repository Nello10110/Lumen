import type fr from '../fr/repartitionGlobale'
import type { Structure } from '../../types'

/** Anglais — espace « repartitionGlobale » (§ BN.1, lot 3), traduit depuis le français. */
const repartitionGlobale: Structure<typeof fr> = {
  badge: "Not allocated",
  badgeAide: "This line has no shares: it counts for the whole household, but no member sees it in their view.",
  repartir: "Allocate",
  repartirAria: "Allocate “{nom}” among household members",
  bandeau: {
    foyer: {
      one: "{n} line is not yet allocated among household members.",
      other: "{n} lines are not yet allocated among household members.",
    },
    vueMembre: "{nom}’s view: values are proportional to their shares.",
    nonComptees: {
      one: "{n} unallocated line is not counted.",
      other: "{n} unallocated lines are not counted.",
    },
    toutAttribuer: "Allocate all",
  },
  modale: {
    titre: "Allocate all",
    introduction: "Applies the same split to every line that has none yet. Lines that are already allocated do not change, and nothing is modified until you confirm.",
    apercuTitre: "Lines concerned",
    actifs: { one: "{n} asset", other: "{n} assets" },
    prets: { one: "{n} loan", other: "{n} loans" },
    et: "and",
    rienARepartir: "All lines are already allocated.",
    choix: "Split to apply",
    appliquer: "Allocate",
    enCours: "Allocating…",
    annuler: "Cancel",
    fermer: "Close",
    termine: "Done: {lignes} now have shares.",
  },
  prorata: "{pct} of {valeur}",
  repartirModale: {
    titre: "Allocate “{nom}”",
    introduction: "Sets who holds this line and for what share.",
    enregistrer: "Save the split",
    enregistree: "Split saved.",
    fermer: "Close",
  },
  quiLeDetient: {
    titre: "Who holds it",
    resumeParts: "{nom} {pct}",
    resumeAucune: "no share (the line stays with the whole household)",
    aide: "Each household member holds a share of this line; without a split, it appears in no member’s view.",
  },
  importQuestion: {
    titre: "Which member do these lines belong to?",
    aide: "This split applies to the lines this import creates. Lines that already exist keep their shares.",
    dernierChoix: "Your last choice for this household is used.",
    invalide: "Complete the split (100%) to import.",
  },
  homonyme: {
    titre: "An account “{nom}” already exists",
    detenuPar: "It is held by {membres}. An account name is unique within the household.",
    sansMembre: "An account name is unique within the household.",
    pourQui: "For which member?",
    ajouter: "Add {nom} to this account",
    renommer: "Rename to “{nouveau}”",
    ajouteIntro: "{nom} is being added to this account: adjust the shares, then save.",
    separateur: "—",
  },
  avisFoyerEntier: {
    analyse: "This screen shows the whole household: {nom}’s view does not apply here (the Trend tab has its own member choice).",
    rapport: "This report covers the whole household: {nom}’s view does not apply here.",
  },
  nonRepartiCompte: "At least one line of this account is not allocated among household members — click to allocate it",
  membresDuCompte: "Household members of this account: {membres}",
}

export default repartitionGlobale
