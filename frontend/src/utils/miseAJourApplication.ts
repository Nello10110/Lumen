/** Mémoire de session de la mise à jour de l'application (correctif #88).
 *
 * Le service worker en attente s'appelle toujours `/sw.js` : rien dans son URL ne dit de
 * quelle version il s'agit. On la déduit du contenu du fichier — son manifeste de
 * précache change à chaque build qui change l'application, et à elle seule (le build est
 * reproductible : deux builds du même code donnent le même `sw.js`).
 *
 * Deux marqueurs, portés par l'onglet (`sessionStorage`) :
 * - « Plus tard » : la bannière ne revient pas pour CETTE version, et réapparaît pour la
 *   suivante ;
 * - rechargement silencieux déjà tenté : jamais deux fois pour la même version, pour
 *   qu'une mise à jour qui n'aboutirait pas ne puisse pas former une boucle de
 *   rechargements (c'est aussi la garde que prend `reinitialisationApplication` pour
 *   la sienne, sous une autre clé). */

const CLE_REPORTEE = 'lumen:maj-reportee'
const CLE_RECHARGEE = 'lumen:maj-rechargee'

/** Empreinte courte et stable d'un texte (FNV-1a 32 bits) : il s'agit de reconnaître une
 * version, pas de se protéger d'une falsification. */
export function empreinte(texte: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

/** Version du service worker en attente, ou `null` si elle ne peut pas être lue (réseau
 * coupé...) : l'appelant ne mémorise alors rien et n'agit pas sans prévenir. */
export async function lireVersionEnAttente(): Promise<string | null> {
  try {
    const reponse = await fetch('/sw.js', { cache: 'no-cache' })
    if (!reponse.ok) return null
    return empreinte(await reponse.text())
  } catch {
    return null
  }
}

function lire(cle: string): string | null {
  try {
    return sessionStorage.getItem(cle)
  } catch {
    return null
  }
}

function ecrire(cle: string, valeur: string): void {
  try {
    sessionStorage.setItem(cle, valeur)
  } catch {
    // Sans stockage (navigation privée stricte), rien n'est mémorisé : au pire la
    // bannière revient, ce qui vaut mieux qu'un rechargement sans garde.
  }
}

export const versionReportee = (version: string): boolean => lire(CLE_REPORTEE) === version
export const reporterVersion = (version: string): void => ecrire(CLE_REPORTEE, version)
export const versionDejaRechargee = (version: string): boolean => lire(CLE_RECHARGEE) === version
export const marquerVersionRechargee = (version: string): void => ecrire(CLE_RECHARGEE, version)

const CHAMPS_DE_SAISIE = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select'

/** Vrai si une modale ou une feuille est ouverte (portails de `Modale.tsx`, feuilles
 * mobiles) : recharger la fermerait sous les doigts de l'utilisateur. */
export function modaleOuverte(): boolean {
  return document.querySelector('[role="dialog"], [aria-modal="true"], dialog[open]') !== null
}

export function estChampDeSaisie(cible: EventTarget | null): boolean {
  return cible instanceof Element && cible.matches(CHAMPS_DE_SAISIE)
}
