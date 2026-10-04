/** Textes français — espace « repartitionMembres » : la répartition d'un bien, d'un compte ou
 * d'un prêt entre les membres du foyer (§ BN.1, lot 2). */
const repartitionMembres = {
  raccourcis: "Raccourcis de répartition",
  partsEgales: "À parts égales",
  toutPour: "100 % {nom}",
  partDe: "Part de {nom} (%)",
  curseurDe: "Part de {nom}, curseur",
  moins: "Retirer 1 % à {nom}",
  plus: "Ajouter 1 % à {nom}",
  partDetenue: "Part détenue :",
  partNette: "Part nette :",
  aidePartDetenue: "Valeur du bien revenant à ce membre, au prorata de sa part, SANS déduire le prêt.",
  aidePartNette: "Part détenue MOINS la part du capital restant dû du prêt rattaché.",
  total: "Total : {total}",
  complet: "complet",
  aucunePart: "Aucune part attribuée : sans répartition, tout reste au foyer.",
  manque: "Il manque {ecart} — l'ajouter à {nom} ?",
  trop: "Il y a {ecart} de trop — les retirer à {nom} ?",
  manqueSimple: "Il manque {ecart} pour atteindre 100 %.",
  tropSimple: "Il y a {ecart} de trop : le total doit faire 100 %.",
  ajouterA: "Ajouter à {nom}",
  retirerA: "Retirer à {nom}",
  suitPret: "Le prêt suit la même répartition.",
} as const

export default repartitionMembres
