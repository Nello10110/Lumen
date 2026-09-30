import { CLE_DETENTEUR } from '../contexts/preferencesAffichageContextObject'

/** Recharge l'application depuis la racine après un changement de foyer courant
 * (bascule, foyer quitté, invitation acceptée par un compte qui en avait déjà un).
 *
 * Une navigation COMPLÈTE plutôt qu'un simple rechargement de l'état React : aucune
 * donnée du foyer précédent ne doit rester affichée, ni dans un composant, ni dans un
 * cache de module (logos d'établissements, tri d'un tableau...). La racine, et non
 * l'URL courante : la fiche `/comptes/12` d'un foyer n'existe pas dans l'autre.
 *
 * Le détenteur filtré (`localStorage`) est propre au foyer — ses identifiants ne
 * désignent personne dans un autre — et est donc effacé avant de recharger. */
export function rechargerApplication(): void {
  try {
    window.localStorage.removeItem(CLE_DETENTEUR)
  } catch {
    // Stockage indisponible : le filtre n'a alors jamais pu être mémorisé.
  }
  window.location.assign('/')
}
