#!/usr/bin/env node
/** Régénère `src/i18n/locales/<langue>/index.ts` (backlog § BL.2) : un fichier de
 * textes par écran ou composant (`fr/<espace>.ts`), assemblés ici. Pour chaque autre
 * langue, l'index importe le fichier de même nom — s'il manque, la compilation
 * échoue : impossible d'oublier de traduire un écran migré. */
import fs from 'node:fs'
import path from 'node:path'

const RACINE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'i18n', 'locales')
const LANGUES = ['fr', 'en', 'es', 'de', 'it']
const espaces = fs
  .readdirSync(path.join(RACINE, 'fr'))
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .map((f) => f.replace(/\.ts$/, ''))
  .sort()

for (const langue of LANGUES) {
  fs.mkdirSync(path.join(RACINE, langue), { recursive: true })
  const imports = espaces.map((e) => `import ${e} from './${e}'`).join('\n')
  const corps = espaces.map((e) => `  ${e},`).join('\n')
  fs.writeFileSync(
    path.join(RACINE, langue, 'index.ts'),
    `// Généré par \`scripts/i18n-agreger.mjs\` — ne pas modifier à la main.
${imports}

const espaces = {
${corps}
}${langue === 'fr' ? ' as const' : ''}

export default espaces
`,
  )
}
console.log(`${espaces.length} espace(s) : ${espaces.join(', ')}`)
