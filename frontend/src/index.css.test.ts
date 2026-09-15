/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Filet de sécurité (16/09/2026) : trois animations livrées le 15/09/2026 (§ AH.1,
// AH.2, AH.3) sont restées invisibles en production pendant près d'une journée —
// leurs `@keyframes`/`.animate-lumen-*` avaient disparu de `index.css` lors d'une
// reconstruction manuelle du fichier en cours de session, jamais remarqué parce
// qu'aucun test ne le vérifiait : les tests React (jsdom) ne rendent aucune
// animation CSS, ils ne peuvent verrouiller qu'une CHAÎNE DE CARACTÈRES de
// classe — `expect(el.className).toContain('animate-lumen-x')` passe même quand
// la règle CSS correspondante n'existe nulle part. Ce test-ci ferme cet angle
// mort : analyse statique de `index.css` (pas de rendu), zéro faux négatif
// possible sur ce point précis.
//
// `node:fs` plutôt qu'un import `?raw` (Vite) : Vitest désactive par défaut le
// traitement des imports `.css` (`test.css`, non activé dans `vite.config.ts`) et
// les remplace par un module vide — y compris pour une variante `?raw`, qui
// ressemble encore assez à un chemin `.css` pour être interceptée. Lire le
// fichier directement contourne ce stub. `/// <reference types="node" />` en tête
// de fichier plutôt qu'ajouter `"node"` aux `types` globaux de
// `tsconfig.app.json` : ce fichier seul a besoin de l'API Node (c'est un test
// d'outillage statique, jamais exécuté dans un navigateur), le reste du code
// applicatif doit rester sans accès à `fs`/`process`/etc.
const RACINE_SRC = join(import.meta.dirname)

function listerFichiersSource(dir: string, fichiers: string[] = []): string[] {
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    if (entree.name === 'node_modules') continue
    const chemin = join(dir, entree.name)
    if (entree.isDirectory()) {
      listerFichiersSource(chemin, fichiers)
    } else if (/\.tsx?$/.test(entree.name) && !entree.name.endsWith('.test.ts') && !entree.name.endsWith('.test.tsx')) {
      fichiers.push(chemin)
    }
  }
  return fichiers
}

function nomsClassesUtilisees(): Set<string> {
  const noms = new Set<string>()
  for (const fichier of listerFichiersSource(RACINE_SRC)) {
    const contenu = readFileSync(fichier, 'utf-8')
    for (const m of contenu.matchAll(/animate-lumen-[a-z-]+/g)) noms.add(m[0])
  }
  return noms
}

// Retire le contenu des blocs `@media (prefers-reduced-motion...) { ... }`
// (comptage d'accolades, pas une regex sur des accolades imbriquées, qui ne peut
// pas être fiable) — sans quoi une classe dont la SEULE règle survivante serait
// celle qui la désactive (`.animate-lumen-x { animation: none; }`, à l'intérieur
// de ce bloc) compterait à tort comme « définie ». Piège réel rencontré en
// écrivant ce test : une suppression partielle qui n'enlève que la règle
// principale laisse ce bloc de repli intact, et une regex naïve la voit comme
// une définition valide.
function sansBlocsReducedMotion(css: string): string {
  let resultat = ''
  let i = 0
  while (i < css.length) {
    const debut = css.indexOf('@media', i)
    if (debut === -1) {
      resultat += css.slice(i)
      break
    }
    const enteteFin = css.indexOf('{', debut)
    if (enteteFin === -1) {
      resultat += css.slice(i)
      break
    }
    const entete = css.slice(debut, enteteFin)
    resultat += css.slice(i, debut)
    // Trouve l'accolade fermante correspondante par comptage de profondeur.
    let profondeur = 1
    let j = enteteFin + 1
    while (j < css.length && profondeur > 0) {
      if (css[j] === '{') profondeur++
      else if (css[j] === '}') profondeur--
      j++
    }
    if (!entete.includes('prefers-reduced-motion')) {
      resultat += css.slice(debut, j)
    }
    i = j
  }
  return resultat
}

function nomsClassesDefinies(css: string): Set<string> {
  const noms = new Set<string>()
  const hors = sansBlocsReducedMotion(css)
  // `.animate-lumen-x {` ou `.animate-lumen-x{` — jamais `@keyframes lumen-x`, qui
  // porte un nom d'animation, pas un nom de classe CSS.
  for (const m of hors.matchAll(/\.(\banimate-lumen-[a-z-]+)\s*\{/g)) noms.add(m[1])
  return noms
}

describe('index.css — chaque classe `animate-lumen-*` utilisée est bien définie', () => {
  const css = readFileSync(join(RACINE_SRC, 'index.css'), 'utf-8')
  const definies = nomsClassesDefinies(css)
  const utilisees = nomsClassesUtilisees()

  it('au moins une classe `animate-lumen-*` est définie (le test lui-même ne doit pas être un faux positif silencieux)', () => {
    expect(definies.size).toBeGreaterThan(0)
  })

  it('au moins une classe `animate-lumen-*` est utilisée quelque part dans le code (idem)', () => {
    expect(utilisees.size).toBeGreaterThan(0)
  })

  for (const nom of Array.from(utilisees).sort()) {
    it(`\`${nom}\`, référencée dans le code, a bien une règle CSS dans index.css`, () => {
      expect(definies.has(nom)).toBe(true)
    })
  }
})
