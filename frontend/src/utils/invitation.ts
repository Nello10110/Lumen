/** Jeton d'invitation : `secrets.token_urlsafe(32)` côté serveur, donc uniquement des
 * lettres, chiffres, `-` et `_`. */
const JETON_VALIDE = /^[A-Za-z0-9_-]+$/

/** Le jeton contenu dans ce que l'utilisateur a collé : le lien complet
 * (`https://…/invitation#<jeton>`) ou le jeton seul. Chaîne vide si rien d'exploitable —
 * un lien sans fragment, par exemple, ne porte aucun jeton. */
export function extraireJeton(saisie: string): string {
  const texte = saisie.trim()
  const diese = texte.lastIndexOf('#')
  const candidat = diese >= 0 ? texte.slice(diese + 1).trim() : texte
  return JETON_VALIDE.test(candidat) ? candidat : ''
}

/** Lien à transmettre : le jeton est dans le fragment, que le navigateur n'envoie ni au
 * serveur ni dans le `Referer` — il ne finit dans aucun journal de proxy. */
export function lienInvitation(jeton: string): string {
  return `${window.location.origin}/invitation#${jeton}`
}
