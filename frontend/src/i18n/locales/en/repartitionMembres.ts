import type fr from '../fr/repartitionMembres'
import type { Structure } from '../../types'

/** Anglais — espace « repartitionMembres » (backlog § BL.2), traduit depuis le français. */
const repartitionMembres: Structure<typeof fr> = {
  raccourcis: "Split shortcuts",
  partsEgales: "Equal shares",
  toutPour: "100% {nom}",
  partDe: "{nom}’s share (%)",
  curseurDe: "{nom}’s share, slider",
  moins: "Take 1% off {nom}",
  plus: "Add 1% to {nom}",
  partDetenue: "Share held:",
  partNette: "Net share:",
  aidePartDetenue: "Value of the property going to this member, in proportion to their share, WITHOUT deducting the loan.",
  aidePartNette: "Share held MINUS their share of the outstanding principal of the linked loan.",
  total: "Total: {total}",
  complet: "complete",
  aucunePart: "No share assigned: without a split, everything stays with the household.",
  manque: "{ecart} missing — add it to {nom}?",
  trop: "{ecart} too much — take it off {nom}?",
  manqueSimple: "{ecart} missing to reach 100%.",
  tropSimple: "{ecart} too much: the total must be 100%.",
  ajouterA: "Add to {nom}",
  retirerA: "Take off {nom}",
  suitPret: "The loan follows the same split.",
}

export default repartitionMembres
