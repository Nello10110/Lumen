/** Copie `texte` dans le presse-papiers ; `true` si la copie a réussi.
 *
 * `navigator.clipboard` n'existe que sur une origine sécurisée (HTTPS, ou localhost) :
 * une installation familiale servie en HTTP sur le réseau local n'y a pas droit. Repli
 * sur `champ` (un champ de saisie déjà affiché, dont on sélectionne le contenu) et
 * `execCommand('copy')`, dépréciée mais toujours prise en charge — sinon le bouton
 * « Copier » ne ferait rien là où justement on en a besoin. */
export async function copierTexte(texte: string, champ?: HTMLInputElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(texte)
      return true
    }
  } catch {
    // Permission refusée : on essaie le repli.
  }
  if (!champ) return false
  champ.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  }
}
