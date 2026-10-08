/** Reconnexion automatique quand le serveur ne répond pas (correctif #88).
 *
 * Après un déploiement, le backend redémarre (migrations comprises) et ne répond pas
 * pendant quelques secondes, parfois une demi-minute. Ce n'est pas une panne : l'écran
 * qui en est témoin réessaie de lui-même plutôt que de demander à l'utilisateur de
 * « vider le cache ». Le rythme est partagé entre l'écran de connexion et la
 * vérification de la session au démarrage (`AuthContext`). */

/** Attente avant le (n+1)-ième essai : 1 s, 2 s, 4 s, 8 s, puis 10 s. */
export function delaiAvantEssai(essai: number): number {
  return Math.min(1000 * 2 ** essai, 10_000)
}

/** Au-delà de cette durée cumulée d'attente, on cesse de réessayer seul : la panne dure
 * et c'est à l'utilisateur de décider. */
export const DUREE_MAX_REESSAIS_MS = 120_000

/** Vrai tant qu'un essai de plus tient dans la durée maximale. `essai` : nombre
 * d'attentes déjà subies. */
export function peutReessayer(essai: number): boolean {
  let cumul = 0
  for (let i = 0; i <= essai; i++) cumul += delaiAvantEssai(i)
  return cumul <= DUREE_MAX_REESSAIS_MS
}
