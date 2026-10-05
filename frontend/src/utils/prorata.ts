import type { Compte, Detenteur } from '../api/types'

/** Part d'une ligne dans la vue d'UN membre du foyer, entre 0 et 1 (§ BN.1, lot 3) : 1 quand
 * aucun membre n'est sélectionné (`quotite_pct` absent). `valeur` y est déjà proratisée par le
 * serveur ; les montants que l'écran calcule lui-même à partir de `quantite` ou du coût (gains,
 * versements) se multiplient par ce facteur pour rester sur la même base. */
export function facteurPart(ligne: { quotite_pct?: number | null }): number {
  return (ligne.quotite_pct ?? 100) / 100
}

/** Noms des membres désignés par ces identifiants, dans l'ordre de la liste des membres. */
export function nomsDesMembres(ids: number[], membres: Detenteur[]): string {
  return membres.filter((m) => ids.includes(m.id)).map((m) => m.nom).join(', ')
}

/** « Compte · Établissement · membres » : de quoi distinguer deux comptes de même nom
 * d'établissement. Les membres ne sont dits qu'à partir de deux membres dans le foyer : avec un
 * seul, ce serait du bruit. */
export function libelleCompteComplet(compte: Compte, membres: Detenteur[]): string {
  const morceaux = [compte.nom]
  if (compte.etablissement) morceaux.push(compte.etablissement.nom)
  if (membres.length >= 2 && compte.membres_ids && compte.membres_ids.length > 0) {
    morceaux.push(nomsDesMembres(compte.membres_ids, membres))
  }
  return morceaux.join(' · ')
}
