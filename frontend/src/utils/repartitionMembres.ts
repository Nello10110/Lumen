import type { QuotiteEntree } from '../api/types'
import { localeCourante } from '../i18n'

/** Règles de la répartition d'un bien, d'un compte ou d'un prêt entre les membres du foyer
 * (§ BN.1, lot 2) — des fonctions pures, partagées par `RepartitionMembres` (l'écran) et
 * `useEditeurQuotites` (l'enregistrement), pour qu'une règle ne vive qu'à un endroit.
 *
 * Les parts sont des CHAÎNES : c'est ce que tape l'utilisateur (« 33,3 », « », « 12. »), et
 * un champ ne doit jamais réécrire ce qu'on est en train de saisir. Le nombre n'apparaît
 * qu'au calcul. */

/** Tolérance sur la somme des parts, en points de pourcentage — la même que le serveur
 * (`detenteurs_service.TOLERANCE_SOMME_PCT`). Elle vivait en trois exemplaires qui avaient
 * déjà divergé (revue du 03/09/2026) : une seule règle financière, un seul endroit. */
export const TOLERANCE_SOMME_PCT = 0.01

export type Repartition = Record<number, string>

/** Nombre saisi (virgule tolérée) ; une cellule vide ou illisible compte pour 0. */
export function nombreSaisi(brut: string | undefined): number {
  if (brut === undefined) return 0
  const valeur = Number(brut.trim().replace(',', '.'))
  return Number.isFinite(valeur) ? valeur : 0
}

/** Écriture d'une part sans bruit de flottant (« 33.33 », jamais « 33.330000000000002 »). */
export function formaterPart(valeur: number): string {
  return String(Math.round(valeur * 100) / 100)
}

/** Parts égales, l'arrondi absorbé par le DERNIER membre : 3 membres → 33,33 / 33,33 / 33,34,
 * pour que la somme fasse toujours exactement 100. Calculé en centièmes entiers. */
export function partsEgales(ids: number[]): Repartition {
  const n = ids.length
  if (n === 0) return {}
  const base = Math.floor(10000 / n)
  const resultat: Repartition = {}
  ids.forEach((id, i) => {
    const centiemes = i === n - 1 ? 10000 - base * (n - 1) : base
    resultat[id] = formaterPart(centiemes / 100)
  })
  return resultat
}

/** La règle par défaut d'un bien neuf : un seul membre en a 100 %, plusieurs se partagent
 * à parts égales. Aucun membre : rien. */
export function repartitionParDefaut(ids: number[]): Repartition {
  return partsEgales(ids)
}

/** « 100 % pour ce membre », les autres à 0. */
export function toutPour(id: number, ids: number[]): Repartition {
  return Object.fromEntries(ids.map((autre) => [autre, autre === id ? '100' : '0']))
}

export function depuisQuotites(quotites: QuotiteEntree[]): Repartition {
  return Object.fromEntries(quotites.map((q) => [q.detenteur_id, formaterPart(q.quotite_pct)]))
}

export function totalRepartition(valeurs: Repartition, ids: number[]): number {
  return ids.reduce((somme, id) => somme + Math.max(0, nombreSaisi(valeurs[id])), 0)
}

/** Une répartition est « en cours » dès qu'une part est strictement positive ; toutes à zéro,
 * c'est « ne pas répartir » (le bien reste au foyer entier), pas une erreur. */
export function repartitionEnCours(valeurs: Repartition, ids: number[]): boolean {
  return ids.some((id) => nombreSaisi(valeurs[id]) > 0)
}

export function totalValide(valeurs: Repartition, ids: number[]): boolean {
  return !repartitionEnCours(valeurs, ids) || Math.abs(totalRepartition(valeurs, ids) - 100) < TOLERANCE_SOMME_PCT
}

/** Écart à 100 : positif = il manque, négatif = il y en a trop. Arrondi au centième pour ne
 * jamais annoncer « il manque 0,00000000001 % ». */
export function ecartAvecCent(valeurs: Repartition, ids: number[]): number {
  return Math.round((100 - totalRepartition(valeurs, ids)) * 100) / 100
}

/** Le correctif qu'on propose d'un clic quand le total n'est pas 100 : où mettre ce qui
 * manque (le membre qui en a le moins, le dernier en cas d'égalité), ou d'où retirer ce qui
 * dépasse (celui qui en a le plus, s'il a de quoi absorber l'excédent). `null` si aucun
 * correctif à un seul clic n'a de sens. */
export function correctifProposable(valeurs: Repartition, ids: number[]): { id: number; apres: string; ecart: number } | null {
  const ecart = ecartAvecCent(valeurs, ids)
  if (ids.length === 0 || Math.abs(ecart) < TOLERANCE_SOMME_PCT) return null
  const parts = ids.map((id) => ({ id, valeur: nombreSaisi(valeurs[id]) }))
  if (ecart > 0) {
    const cible = parts.reduce((min, p) => (p.valeur <= min.valeur ? p : min))
    return { id: cible.id, apres: formaterPart(cible.valeur + ecart), ecart }
  }
  const cible = parts.reduce((max, p) => (p.valeur >= max.valeur ? p : max))
  if (cible.valeur + ecart < 0) return null
  return { id: cible.id, apres: formaterPart(cible.valeur + ecart), ecart }
}

/** Les parts strictement positives, telles que le serveur les attend. */
export function quotitesDepuis(valeurs: Repartition, ids: number[]): QuotiteEntree[] {
  return ids
    .map((id) => ({ detenteur_id: id, quotite_pct: nombreSaisi(valeurs[id]) }))
    .filter((q) => q.quotite_pct > 0)
}

/** Borne une part saisie entre 0 et 100 (les boutons − / + et le curseur). */
export function borner(valeur: number): number {
  return Math.min(100, Math.max(0, valeur))
}

/** « 33,33 % » — le nombre de décimales utile seulement, dans le format de la langue. */
export function formaterPourcentage(valeur: number): string {
  return new Intl.NumberFormat(localeCourante(), { style: 'percent', maximumFractionDigits: 2 }).format(valeur / 100)
}
