/** Jeton d'invitation gardé le temps d'une page rechargée ou d'un aller-retour SSO
 * (backlog § BK.2b).
 *
 * `sessionStorage`, pas `localStorage` : le jeton ne doit ni survivre à la fermeture de
 * l'onglet ni se retrouver dans un autre. La page `/invitation` le lit dans le
 * FRAGMENT de l'URL (jamais envoyé au serveur), le garde ici, puis retire le fragment
 * de la barre d'adresse.
 *
 * `apresSso` distingue le jeton qu'un retour de connexion SSO doit accepter tout seul
 * de celui d'un lien simplement ouvert puis abandonné : sans cela, un jeton oublié dans
 * l'onglet serait accepté à la prochaine connexion, sans que personne l'ait demandé. */
const CLE = 'lumen.invitation-en-attente'

export interface InvitationEnAttente {
  jeton: string
  apresSso: boolean
}

function ecrire(valeur: InvitationEnAttente): void {
  try {
    window.sessionStorage.setItem(CLE, JSON.stringify(valeur))
  } catch {
    // Stockage indisponible (fenêtre privée stricte) : le jeton ne survivra pas à un
    // rechargement, la page s'en tiendra à ce qu'elle a en mémoire.
  }
}

export function garderInvitation(jeton: string): void {
  ecrire({ jeton, apresSso: false })
}

/** À appeler juste avant de quitter la page pour le fournisseur SSO. */
export function armerRetourSso(jeton: string): void {
  ecrire({ jeton, apresSso: true })
}

export function invitationGardee(): InvitationEnAttente | null {
  try {
    const brut = window.sessionStorage.getItem(CLE)
    if (!brut) return null
    const valeur = JSON.parse(brut) as Partial<InvitationEnAttente>
    if (typeof valeur.jeton !== 'string' || !valeur.jeton) return null
    return { jeton: valeur.jeton, apresSso: valeur.apresSso === true }
  } catch {
    return null
  }
}

export function oublierInvitation(): void {
  try {
    window.sessionStorage.removeItem(CLE)
  } catch {
    // Rien à effacer si le stockage est inaccessible.
  }
}
