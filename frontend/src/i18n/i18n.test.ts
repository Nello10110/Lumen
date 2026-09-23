import { afterEach, describe, expect, it } from 'vitest'
import { LANGUES } from './langues'
import de from './locales/de'
import en from './locales/en'
import es from './locales/es'
import fr from './locales/fr'
import it_ from './locales/it'
import { activerLangue, detecterLangueAppareil, localeCourante, memoriserLangue, t } from './index'

function definirNavigateur(langues: string[]) {
  Object.defineProperty(window.navigator, 'language', { value: langues[0], configurable: true })
  Object.defineProperty(window.navigator, 'languages', { value: langues, configurable: true })
}

afterEach(async () => {
  await activerLangue('fr')
  localStorage.removeItem('lumen.langue')
  definirNavigateur(['fr-FR', 'fr'])
})

describe('t() — traduction (backlog § BL)', () => {
  it('rend le texte français de référence par défaut', () => {
    expect(t('nav.synthese')).toBe('Synthèse')
    expect(localeCourante()).toBe('fr-FR')
  })

  it('insère les valeurs nommées, et laisse visible un paramètre non fourni', () => {
    expect(t('assistant.etapeSur', { n: 2, total: 6 })).toBe('Étape 2 sur 6')
    expect(t('assistant.etapeSur', { n: 2 })).toBe('Étape 2 sur {total}')
  })

  it("accorde au nombre : « 1 position », « 3 positions »", () => {
    expect(t('assistant.demarrage.positions', { n: 1 })).toBe('1 position')
    expect(t('assistant.demarrage.positions', { n: 3 })).toBe('3 positions')
  })

  it("une fois l'anglais activé : textes, pluriel et format des nombres de l'anglais", async () => {
    await activerLangue('en')

    expect(t('nav.synthese')).toBe('Overview')
    expect(t('assistant.demarrage.positions', { n: 1 })).toBe('1 position')
    expect(t('assistant.demarrage.positions', { n: 2 })).toBe('2 positions')
    // Un nombre inséré suit le format de la langue (séparateur de milliers).
    expect(t('assistant.etapeSur', { n: 1234, total: 5 })).toBe('Step 1,234 of 5')
    expect(localeCourante()).toBe('en-US')
  })
})

describe("detecterLangueAppareil — langue avant connexion", () => {
  it('le dernier choix fait sur cet appareil prime sur le navigateur', () => {
    definirNavigateur(['de-DE'])
    memoriserLangue('it')

    expect(detecterLangueAppareil()).toBe('it')
  })

  it('sinon la première langue du navigateur que Lumen propose, variante régionale comprise', () => {
    definirNavigateur(['pt-BR', 'es-MX', 'en-GB'])

    expect(detecterLangueAppareil()).toBe('es')
  })

  it("sinon le français, jamais une langue que l'application n'a pas", () => {
    definirNavigateur(['pt-BR', 'ja'])

    expect(detecterLangueAppareil()).toBe('fr')
  })
})

// TypeScript garantit déjà que chaque langue a TOUTES les clés du français
// (`Dictionnaire`). Ce qu'il ne voit pas : une valeur insérée oubliée ou mal
// orthographiée dans une traduction (« {nombre} » au lieu de « {n} »), qui
// s'afficherait telle quelle à l'écran — et un texte laissé vide.
describe('dictionnaires — cohérence avec le français de référence', () => {
  function feuilles(noeud: unknown, prefixe = ''): Map<string, string> {
    const resultat = new Map<string, string>()
    for (const [cle, valeur] of Object.entries(noeud as Record<string, unknown>)) {
      const chemin = prefixe ? `${prefixe}.${cle}` : cle
      if (typeof valeur === 'string') resultat.set(chemin, valeur)
      else for (const [c, v] of feuilles(valeur, chemin)) resultat.set(c, v)
    }
    return resultat
  }

  const parametres = (texte: string) => [...texte.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
  const reference = feuilles(fr)
  const traductions = { en, es, de, it: it_ }

  it('chaque langue de la liste a son dictionnaire', () => {
    expect(LANGUES.map((l) => l.code).sort()).toEqual(['fr', ...Object.keys(traductions)].sort())
  })

  for (const [code, dictionnaire] of Object.entries(traductions)) {
    it(`${code} : mêmes textes, mêmes valeurs insérées, aucun texte vide`, () => {
      const traduites = feuilles(dictionnaire)
      for (const [chemin, texteFr] of reference) {
        // Une forme plurielle propre à une langue (« few », « many ») n'existe pas
        // forcément en français : on ne compare que les clés de référence.
        const texte = traduites.get(chemin)
        expect(texte, `${code} : ${chemin}`).toBeTruthy()
        expect(parametres(texte!), `${code} : ${chemin}`).toEqual(parametres(texteFr))
      }
    })
  }
})
