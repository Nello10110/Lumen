/** Traduction de l'interface (backlog § BL).
 *
 * `t()` est une fonction de module, pas un hook : elle sert aussi bien dans un
 * composant que dans une fonction utilitaire ou une constante calculée à l'affichage
 * (libellés de navigation). Le changement de langue remonte l'application sous une
 * nouvelle `key` (`LangueProvider`) : tout se réaffiche dans la nouvelle langue
 * sans qu'aucun composant ait à s'abonner à quoi que ce soit.
 *
 * Le français, langue de référence, est embarqué ; les autres langues sont chargées
 * à la demande (`import()` dynamique) pour ne pas alourdir le premier chargement de
 * quelqu'un qui ne s'en sert pas. */
import fr from './locales/fr'
import { LANGUE_PAR_DEFAUT, estLangue, localeDe, type Langue } from './langues'
import type { Chemins, Pluriel, Structure } from './types'

export type Dictionnaire = Structure<typeof fr>
export type CleTraduction = Chemins<typeof fr>
export type { Langue } from './langues'
export { LANGUES, LANGUE_PAR_DEFAUT, estLangue } from './langues'

const CHARGEURS: Record<Langue, () => Promise<Dictionnaire>> = {
  fr: async () => fr,
  en: () => import('./locales/en').then((m) => m.default),
  es: () => import('./locales/es').then((m) => m.default),
  de: () => import('./locales/de').then((m) => m.default),
  it: () => import('./locales/it').then((m) => m.default),
}

let langueCourante: Langue = LANGUE_PAR_DEFAUT
let dictionnaireCourant: Dictionnaire = fr

export function langueActive(): Langue {
  return langueCourante
}

/** Locale `Intl` de la langue active — formats des nombres, montants et dates. */
export function localeCourante(): string {
  return localeDe(langueCourante)
}

/** Charge le dictionnaire de `langue` puis en fait la langue active. Un échec de
 * chargement (réseau coupé au moment de télécharger le fichier) laisse la langue
 * précédente en place plutôt qu'une interface sans texte. */
export async function activerLangue(langue: Langue): Promise<void> {
  const dictionnaire = await CHARGEURS[langue]()
  langueCourante = langue
  dictionnaireCourant = dictionnaire
}

function chercher(dictionnaire: unknown, cle: string): unknown {
  let noeud: unknown = dictionnaire
  for (const segment of cle.split('.')) {
    if (noeud === null || typeof noeud !== 'object') return undefined
    noeud = (noeud as Record<string, unknown>)[segment]
  }
  return noeud
}

type Parametres = Record<string, string | number>

/** Texte de `cle` dans la langue active. `{nom}` est remplacé par `parametres.nom` ;
 * un nombre est formaté selon la langue. Un texte pluriel (`{ one, other }`) choisit
 * sa forme d'après `parametres.n`. Une clé introuvable (dictionnaire corrompu, ou
 * traduction encore incomplète à l'exécution) retombe sur le français, jamais sur
 * un blanc. */
export function t(cle: CleTraduction, parametres?: Parametres): string {
  let valeur = chercher(dictionnaireCourant, cle)
  if (valeur === undefined) valeur = chercher(fr, cle)
  if (valeur !== null && typeof valeur === 'object') {
    const formes = valeur as Pluriel
    const n = Number(parametres?.n ?? 0)
    const forme = new Intl.PluralRules(localeCourante()).select(n)
    valeur = formes[forme] ?? formes.other
  }
  if (typeof valeur !== 'string') return cle
  if (!parametres) return valeur
  return valeur.replace(/\{(\w+)\}/g, (brut, nom: string) => {
    const remplacement = parametres[nom]
    if (remplacement === undefined) return brut
    return typeof remplacement === 'number' ? remplacement.toLocaleString(localeCourante()) : remplacement
  })
}

// Langue de CET appareil, avant toute connexion (écran de connexion, création du
// premier compte) — une fois connecté, c'est celle du foyer qui prime.
const CLE_STOCKAGE = 'lumen.langue'

export function langueMemorisee(): Langue | null {
  try {
    const valeur = localStorage.getItem(CLE_STOCKAGE)
    return estLangue(valeur) ? valeur : null
  } catch {
    return null
  }
}

export function memoriserLangue(langue: Langue): void {
  try {
    localStorage.setItem(CLE_STOCKAGE, langue)
  } catch {
    // Stockage indisponible (navigation privée stricte) : la langue vaudra pour la
    // session en cours seulement — rien de bloquant.
  }
}

/** Dernier choix fait sur cet appareil, sinon première langue du navigateur que
 * l'application propose (« en-GB » → « en »), sinon le français. */
export function detecterLangueAppareil(): Langue {
  const memorisee = langueMemorisee()
  if (memorisee) return memorisee
  const preferees = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []
  for (const preferee of preferees) {
    const code = preferee?.toLowerCase().split('-')[0]
    if (estLangue(code)) return code
  }
  return LANGUE_PAR_DEFAUT
}
