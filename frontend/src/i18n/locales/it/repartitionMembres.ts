import type fr from '../fr/repartitionMembres'
import type { Structure } from '../../types'

/** Italien — espace « repartitionMembres » (backlog § BL.2), traduit depuis le français. */
const repartitionMembres: Structure<typeof fr> = {
  raccourcis: "Scorciatoie di ripartizione",
  partsEgales: "A quote uguali",
  toutPour: "100 % {nom}",
  partDe: "Quota di {nom} (%)",
  curseurDe: "Quota di {nom}, cursore",
  moins: "Togli 1 % a {nom}",
  plus: "Aggiungi 1 % a {nom}",
  partDetenue: "Quota detenuta:",
  partNette: "Quota netta:",
  aidePartDetenue: "Valore dell’immobile spettante a questo membro, in proporzione alla sua quota, SENZA dedurre il prestito.",
  aidePartNette: "Quota detenuta MENO la quota del capitale residuo del prestito collegato.",
  total: "Totale: {total}",
  complet: "completo",
  aucunePart: "Nessuna quota assegnata: senza ripartizione, tutto resta al nucleo.",
  manque: "Mancano {ecart} — aggiungerli a {nom}?",
  trop: "Ci sono {ecart} in più — toglierli a {nom}?",
  manqueSimple: "Mancano {ecart} per arrivare a 100 %.",
  tropSimple: "Ci sono {ecart} in più: il totale deve fare 100 %.",
  ajouterA: "Aggiungi a {nom}",
  retirerA: "Togli a {nom}",
  suitPret: "Il prestito segue la stessa ripartizione.",
}

export default repartitionMembres
