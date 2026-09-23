#!/usr/bin/env node
/** Outil de migration vers le multilingue (backlog § BL.2) — utilisé une fois par
 * composant, conservé pour les écrans à venir.
 *
 *   node scripts/i18n-extraire.mjs <fichier.tsx> <espace> [--ecrire]
 *
 * Analyse le fichier avec le compilateur TypeScript (jamais d'expressions
 * régulières sur le code) et remplace par `t('<espace>.<clé>')` :
 *   - le texte JSX (`<p>Bonjour</p>`), normalisé comme React l'affiche ;
 *   - les attributs JSX porteurs de texte (`title`, `placeholder`, `label`...) ;
 *   - les chaînes littérales d'une fonction qui ressemblent à du texte affiché.
 * Il ne touche PAS, et les signale pour une reprise à la main :
 *   - les textes au niveau du module (constantes évaluées une seule fois, qui
 *     resteraient dans la langue du chargement) ;
 *   - les gabarits `${...}` mêlant texte et valeurs (pluriels, insertions) ;
 *   - les mots isolés hors JSX, qui sont souvent des codes, pas du texte.
 *
 * Écrit les textes français dans `src/i18n/locales/fr/<espace>.ts` (fusionnés avec
 * l'existant, une même phrase gardant la même clé). */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const [, , fichierArg, espace, ...options] = process.argv
if (!fichierArg || !espace) {
  console.error('usage : i18n-extraire.mjs <fichier.tsx> <espace> [--ecrire]')
  process.exit(2)
}
const ecrire = options.includes('--ecrire')
const fichier = path.resolve(fichierArg)
const source = fs.readFileSync(fichier, 'utf-8')
const sf = ts.createSourceFile(fichier, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

const RACINE_SRC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'src')
const cheminDico = path.join(RACINE_SRC, 'i18n', 'locales', 'fr', `${espace}.ts`)

// --- Dictionnaire existant de l'espace (fusion) -----------------------------------
function lireDico() {
  if (!fs.existsSync(cheminDico)) return {}
  const texte = fs.readFileSync(cheminDico, 'utf-8')
  const sfd = ts.createSourceFile(cheminDico, texte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const resultat = {}
  function objet(noeud) {
    const o = {}
    for (const p of noeud.properties) {
      const cle = p.name.text ?? p.name.getText(sfd)
      const v = p.initializer
      if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) o[cle] = v.text
      else if (ts.isObjectLiteralExpression(v)) o[cle] = objet(v)
    }
    return o
  }
  ts.forEachChild(sfd, function visite(n) {
    if (ts.isVariableDeclaration(n) && n.initializer) {
      let init = n.initializer
      if (ts.isAsExpression(init)) init = init.expression
      if (ts.isObjectLiteralExpression(init)) Object.assign(resultat, objet(init))
    }
    ts.forEachChild(n, visite)
  })
  return resultat
}
const dico = lireDico()
const texteVersCle = new Map(Object.entries(dico).filter(([, v]) => typeof v === 'string').map(([k, v]) => [v, k]))

function slug(texte) {
  const mots = texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
  if (mots.length === 0) return 'texte'
  let cle = mots.map((m, i) => (i === 0 ? m.toLowerCase() : m[0].toUpperCase() + m.slice(1).toLowerCase())).join('')
  if (/^[0-9]/.test(cle)) cle = `t${cle}`
  return cle
}

function cleDe(texte) {
  if (texteVersCle.has(texte)) return texteVersCle.get(texte)
  const base = slug(texte)
  let cle = base
  let i = 2
  while (cle in dico) cle = `${base}${i++}`
  dico[cle] = texte
  texteVersCle.set(texte, cle)
  return cle
}

// --- Règles ------------------------------------------------------------------------
const LETTRE = /[A-Za-zÀ-ÿ]/
const ACCENT = /[À-ÿ]/
const ATTRIBUTS_TECHNIQUES = new Set([
  'className', 'panelClassName', 'd', 'viewBox', 'transform', 'href', 'to', 'type', 'id', 'htmlFor', 'name',
  'role', 'key', 'autoComplete', 'inputMode', 'target', 'rel', 'src', 'method', 'variant', 'niveau', 'taille',
  'semantique', 'mode', 'accept', 'pattern', 'fill', 'stroke', 'xmlns', 'dataKey', 'stackId', 'layout', 'lang',
  'as', 'value', 'defaultValue', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray', 'fillRule',
  'clipRule', 'tabIndex', 'dir', 'form', 'encType', 'action', 'orientation', 'position', 'anchor', 'align',
  'verticalAlign', 'iconType', 'dominantBaseline', 'textAnchor', 'stopColor', 'offset', 'gradientUnits',
  'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'points', 'width', 'height', 'min', 'max', 'step', 'download',
  'couleur', 'tone', 'icone', 'cle', 'onglet', 'interval', 'domain', 'scale', 'unit', 'format', 'data-testid',
])
const FONCTIONS_TECHNIQUES = /^(api\.|fetch$|console\.|localStorage\.|sessionStorage\.|document\.|window\.|new |setSearchParams|searchParams\.|URLSearchParams|matchPath|navigate$|useNavigate|t$|addEventListener|removeEventListener|classList|RegExp|Intl\.|toLocale|require|import|Number$|parseFloat|parseInt|JSON\.|Object\.|Array\.|Math\.|Date|matchMedia|setAttribute|getAttribute|querySelector|history\.|encodeURIComponent|decodeURIComponent|vi\.|expect|describe|it$|test$)/

function dansFonction(n) {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isArrowFunction(p) || ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p)) return true
  }
  return false
}

function dansJsx(n) {
  for (let p = n.parent; p; p = p.parent) {
    if (ts.isJsxExpression(p) || ts.isJsxAttribute(p)) return true
    if (ts.isBlock(p) || ts.isSourceFile(p)) return false
  }
  return false
}

function nomAppel(expr) {
  return expr.getText(sf).split('(')[0]
}

function estTechnique(n) {
  const p = n.parent
  if (!p) return true
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isImportTypeNode?.(p)) return true
  if (ts.isLiteralTypeNode(p)) return true
  if (ts.isCaseClause(p)) return true
  if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(p.operatorToken.kind)) return true
  if (ts.isElementAccessExpression(p) && p.argumentExpression === n) return true
  if (ts.isPropertyAssignment(p) && p.name === n) return true
  if (ts.isJsxAttribute(p)) return ATTRIBUTS_TECHNIQUES.has(p.name.getText(sf)) || p.name.getText(sf).startsWith('aria-hidden') || p.name.getText(sf).startsWith('data-')
  if (ts.isPropertyAssignment(p) && ['className', 'key', 'type', 'variant', 'valeur', 'cle', 'to', 'path', 'id'].includes(p.name.getText(sf))) return true
  if (ts.isCallExpression(p) && FONCTIONS_TECHNIQUES.test(nomAppel(p.expression))) return true
  if (ts.isNewExpression(p)) return true
  // Attribut JSX `className={cond ? 'a b' : 'c'}` : remonter jusqu'à l'attribut.
  for (let q = p; q && !ts.isSourceFile(q); q = q.parent) {
    if (ts.isJsxAttribute(q)) return ATTRIBUTS_TECHNIQUES.has(q.name.getText(sf))
    if (ts.isCallExpression(q) && FONCTIONS_TECHNIQUES.test(nomAppel(q.expression))) return true
    if (ts.isBlock(q)) break
  }
  return false
}

function ressembleATexte(texte, enJsx) {
  if (!LETTRE.test(texte)) return false
  if (/^[a-z]+(_[a-z]+)*$/.test(texte)) return false // code interne : `proprietaire`, `cout_moyen`
  if (/^[A-Z_]+$/.test(texte)) return false // constante : `TOUS`, `EUR`
  if (/^[\w-]+(\/[\w-]+)+/.test(texte) || /^\//.test(texte) || /^https?:/.test(texte)) return false // chemin, URL
  if (/^[\w-]+\.(tsx?|png|svg|pdf|csv|json)$/.test(texte)) return false
  if (/^(bg|text|border|px|py|mt|mb|flex|grid|w-|h-|rounded|shadow|hover|md:|sm:|lg:)/.test(texte)) return false
  if (ACCENT.test(texte) || /\s/.test(texte.trim())) return true
  return enJsx && /^[A-ZÀ-Ý][a-zà-ÿ]{2,}/.test(texte)
}

// --- Parcours ----------------------------------------------------------------------
const remplacements = [] // { debut, fin, texte }
const aReprendre = []
const ENTITES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&hellip;': '…', '&mdash;': '—', '&ndash;': '–', '&laquo;': '«', '&raquo;': '»', '&rarr;': '→', '&larr;': '←', '&euro;': '€', '&thinsp;': ' ', '&middot;': '·' }
const decoder = (s) => s.replace(/&[a-z#0-9]+;/g, (e) => ENTITES[e] ?? e)

function ligne(n) {
  return sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
}

function nettoyerJsx(brut) {
  // Même règle que Babel/React : lignes rognées (sauf bords extérieurs), lignes
  // vides retirées, jointes par un espace.
  const lignes = brut.split(/\r\n|\n|\r/)
  let dernierNonVide = 0
  lignes.forEach((l, i) => { if (/[^ \t]/.test(l)) dernierNonVide = i })
  let resultat = ''
  lignes.forEach((l, i) => {
    let s = l.replace(/\t/g, ' ')
    if (i !== 0) s = s.replace(/^[ ]+/, '')
    if (i !== lignes.length - 1) s = s.replace(/[ ]+$/, '')
    if (s) {
      if (i !== dernierNonVide) s += ' '
      resultat += s
    }
  })
  return resultat
}

function visite(n) {
  if (ts.isJsxText(n)) {
    const nettoye = decoder(nettoyerJsx(n.getFullText(sf)))
    if (nettoye.trim() && LETTRE.test(nettoye)) {
      if (!dansFonction(n)) {
        aReprendre.push(`L${ligne(n)} texte JSX au niveau du module : « ${nettoye.trim()} »`)
      } else {
        const cle = cleDe(nettoye.trim())
        const avant = /^\s/.test(nettoye) ? "{' '}" : ''
        const apres = /\s$/.test(nettoye) ? "{' '}" : ''
        remplacements.push({ debut: n.getStart(sf, false) === n.pos ? n.pos : n.pos, fin: n.end, texte: `${avant}{t('${espace}.${cle}')}${apres}` })
      }
    }
    return
  }
  if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer)) {
    const nom = n.name.getText(sf)
    const texte = n.initializer.text
    // Attributs dont la valeur est TOUJOURS du texte lu par quelqu'un : un seul mot en
    // minuscules (« optionnel ») y est un texte, pas un code.
    const toujoursTexte = ['title', 'placeholder', 'label', 'aria-label', 'ariaLabel', 'alt', 'titre', 'aide', 'description', 'libelle', 'message', 'texte'].includes(nom)
    const estTexte = toujoursTexte ? LETTRE.test(texte) && !/^[a-z]+_[a-z_]+$/.test(texte) : ressembleATexte(texte, true)
    if (!ATTRIBUTS_TECHNIQUES.has(nom) && !nom.startsWith('data-') && nom !== 'aria-hidden' && estTexte) {
      if (!dansFonction(n)) aReprendre.push(`L${ligne(n)} attribut au niveau du module : ${nom}="${texte}"`)
      else {
        const cle = cleDe(texte)
        remplacements.push({ debut: n.initializer.getStart(sf), fin: n.initializer.end, texte: `{t('${espace}.${cle}')}` })
      }
    }
    return
  }
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
    const texte = n.text
    // Au niveau du module, un mot isolé à majuscule (« Nom », « Valeur ») est
    // signalé : il ne sera pas remplacé, mais il mérite un coup d'œil.
    if (!estTechnique(n) && ressembleATexte(texte, dansJsx(n) || !dansFonction(n))) {
      if (!dansFonction(n)) {
        aReprendre.push(`L${ligne(n)} chaîne au niveau du module : « ${texte} »`)
      } else if (!(ACCENT.test(texte) || /\s/.test(texte.trim())) && !dansJsx(n)) {
        aReprendre.push(`L${ligne(n)} mot isolé hors JSX (non remplacé) : « ${texte} »`)
      } else {
        const cle = cleDe(texte)
        remplacements.push({ debut: n.getStart(sf), fin: n.end, texte: `t('${espace}.${cle}')` })
      }
    }
    return
  }
  if (ts.isTemplateExpression(n)) {
    const fixe = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' ')
    if (LETTRE.test(fixe) && (ACCENT.test(fixe) || /[a-zA-Z]{3,} [a-zA-Z]/.test(fixe)) && !estTechnique(n)) {
      aReprendre.push(`L${ligne(n)} gabarit à reprendre : ${n.getText(sf).slice(0, 140)}`)
    }
    // Les sous-expressions d'un gabarit peuvent contenir des chaînes simples.
  }
  ts.forEachChild(n, visite)
}
visite(sf)

// --- Application ---------------------------------------------------------------------
remplacements.sort((a, b) => b.debut - a.debut)
let sortie = source
for (const r of remplacements) sortie = sortie.slice(0, r.debut) + r.texte + sortie.slice(r.fin)

const importI18n = /import \{([^}]*)\} from '([./]*i18n)'/
if (remplacements.length && importI18n.test(sortie) && !/import \{[^}]*\bt\b[^}]*\} from '[./]*i18n'/.test(sortie)) {
  // Un import de `../i18n` existe déjà (ex. `localeCourante`) : `t` le rejoint.
  sortie = sortie.replace(importI18n, (_, noms, chemin) => `import { ${[...noms.split(',').map((x) => x.trim()).filter(Boolean), 't'].sort().join(', ')} } from '${chemin}'`)
} else if (remplacements.length && !/import \{[^}]*\bt\b[^}]*\} from '[./]*i18n'/.test(sortie)) {
  const relatif = path.relative(path.dirname(fichier), path.join(RACINE_SRC, 'i18n')).split(path.sep).join('/')
  const imp = `import { t } from '${relatif.startsWith('.') ? relatif : './' + relatif}'`
  const lignes = sortie.split('\n')
  let derniere = -1
  for (let i = 0; i < Math.min(lignes.length, 120); i++) if (/^import /.test(lignes[i])) derniere = i
  let j = derniere
  if (j >= 0) while (j < lignes.length && !/from '.*'\s*$/.test(lignes[j]) && !/^import '.*'\s*$/.test(lignes[j])) j++
  lignes.splice(j + 1, 0, imp)
  sortie = lignes.join('\n')
}

function serialiser(obj, retrait = '  ') {
  return Object.entries(obj)
    .map(([k, v]) => {
      const cle = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)
      if (typeof v === 'string') return `${retrait}${cle}: ${JSON.stringify(v)},`
      return `${retrait}${cle}: {\n${serialiser(v, retrait + '  ')}\n${retrait}},`
    })
    .join('\n')
}

if (ecrire) {
  fs.writeFileSync(fichier, sortie)
  fs.mkdirSync(path.dirname(cheminDico), { recursive: true })
  fs.writeFileSync(
    cheminDico,
    `/** Textes français — espace « ${espace} » (backlog § BL.2). Généré par
 * \`scripts/i18n-extraire.mjs\`, puis relu à la main. */
const ${espace} = {
${serialiser(dico)}
} as const

export default ${espace}
`,
  )
}
// Pluriel « à la main » (`{n} {t('x.ligne')}{n > 1 ? 's' : ''}`) : à remplacer par
// un texte pluriel `{ one, other }` — l'accord ne se fait pas pareil dans toutes les
// langues.
for (const m of sortie.matchAll(/\{t\('([\w.]+)'\)\}\{[^{}]*\?\s*'s'\s*:\s*''\}/g)) aReprendre.push(`pluriel à reprendre : ${m[0]}`)
for (const m of sortie.matchAll(/\?\s*'s'\s*:\s*''/g)) aReprendre.push(`accord « s » à vérifier près de : ${sortie.slice(Math.max(0, m.index - 80), m.index + 12).replace(/\s+/g, ' ')}`)
console.log(`${path.relative(process.cwd(), fichier)} : ${remplacements.length} remplacement(s), ${Object.keys(dico).length} clé(s) dans « ${espace} »`)
for (const r of aReprendre) console.log('  À REPRENDRE ' + r)
