/** Sortie de secours quand l'application affichée ne parle plus au serveur.
 *
 * Retour utilisateur du 14/09/2026, après deux correctifs insuffisants : « quand je
 * me fais déconnecter sur mon téléphone, il garde en cache l'application mais sans
 * le bouton Authentik, je ne peux plus me connecter et je suis obligé de vider le
 * cache ».
 *
 * Le service worker fait exactement ce qu'on lui demande — servir la coquille de
 * l'application depuis le cache, même sans réseau. Le défaut n'est pas là : c'est
 * qu'une application affichée alors qu'aucun appel n'aboutit est INDISCERNABLE
 * d'une application qui fonctionne. L'utilisateur n'avait donc pas d'autre issue
 * que d'aller vider le cache dans les réglages de son téléphone.
 *
 * Ce module met cette issue dans l'application elle-même, à un clic. */

/** Désinstalle les service workers et vide les caches, puis recharge depuis le
 * réseau. Ne lève jamais : c'est une manœuvre de dernier recours, elle doit
 * aboutir au rechargement même si une étape échoue (navigateur qui refuse l'accès
 * aux caches, navigation privée...). */
export async function reinitialiserApplication(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const enregistrements = await navigator.serviceWorker.getRegistrations()
      await Promise.all(enregistrements.map((r) => r.unregister()))
    }
  } catch {
    // Un service worker qu'on n'a pas pu désinstaller n'empêche pas la suite.
  }
  try {
    if ('caches' in window) {
      const noms = await caches.keys()
      await Promise.all(noms.map((nom) => caches.delete(nom)))
    }
  } catch {
    // Idem : le rechargement ci-dessous reste la partie qui compte.
  }
  // `location.reload()` et non un `fetch` : seule une navigation COMPLÈTE peut être
  // interceptée et redirigée par un portail d'authentification placé devant
  // l'application (cf. `ErreurPortailAuthentification` dans `api/client.ts`).
  window.location.reload()
}

// Un rechargement automatique est utile — l'utilisateur n'a rien à faire — mais ne
// doit JAMAIS pouvoir boucler : si le portail redirige à nouveau vers une
// application qui échoue encore, on retomberait dans un cycle de rechargements
// infini, bien pire que le problème d'origine. Ce marqueur, porté par l'onglet
// (`sessionStorage`, effacé à sa fermeture), garantit une seule tentative
// automatique par session ; ensuite, c'est à l'utilisateur de décider.
const CLE_TENTATIVE = 'patrimoine:rechargement-portail'

/** Consomme le droit à UN rechargement automatique. `true` la première fois dans
 * l'onglet, `false` ensuite — l'appelant affiche alors un message et un bouton. */
export function peutRechargerAutomatiquement(): boolean {
  try {
    if (sessionStorage.getItem(CLE_TENTATIVE)) return false
    sessionStorage.setItem(CLE_TENTATIVE, '1')
    return true
  } catch {
    // `sessionStorage` inaccessible (navigation privée stricte) : sans moyen de
    // compter les tentatives, on ne recharge pas — mieux vaut un message qu'une
    // boucle.
    return false
  }
}

/** Efface le marqueur — appelé dès qu'un appel réseau aboutit, pour qu'une panne
 * plus tard dans la même session ait de nouveau droit à sa tentative. */
export function oublierTentativeRechargement(): void {
  try {
    sessionStorage.removeItem(CLE_TENTATIVE)
  } catch {
    // Sans stockage, il n'y avait de toute façon pas de marqueur à effacer.
  }
}
