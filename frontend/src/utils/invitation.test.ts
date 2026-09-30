import { describe, expect, it } from 'vitest'
import { extraireJeton, lienInvitation } from './invitation'

describe('extraireJeton', () => {
  it('extrait le jeton d’un lien complet, dans le fragment', () => {
    expect(extraireJeton('https://lumen.example/invitation#abc_DEF-123')).toBe('abc_DEF-123')
  })

  it('accepte le jeton seul, avec ou sans espaces autour', () => {
    expect(extraireJeton('abc_DEF-123')).toBe('abc_DEF-123')
    expect(extraireJeton('  abc_DEF-123\n')).toBe('abc_DEF-123')
  })

  it('accepte un fragment collé tel quel, avec son dièse', () => {
    expect(extraireJeton('#abc_DEF-123')).toBe('abc_DEF-123')
  })

  it('renvoie une chaîne vide pour un lien sans fragment', () => {
    expect(extraireJeton('https://lumen.example/invitation')).toBe('')
  })

  it('renvoie une chaîne vide pour une saisie vide ou qui n’est pas un jeton', () => {
    expect(extraireJeton('')).toBe('')
    expect(extraireJeton('   ')).toBe('')
    expect(extraireJeton('pas un jeton !')).toBe('')
    expect(extraireJeton('https://lumen.example/invitation#')).toBe('')
  })
})

describe('lienInvitation', () => {
  it('place le jeton dans le fragment de l’origine courante, jamais dans le chemin ni la requête', () => {
    const lien = lienInvitation('abc123')

    expect(lien).toBe(`${window.location.origin}/invitation#abc123`)
    expect(lien).not.toContain('?')
  })
})
