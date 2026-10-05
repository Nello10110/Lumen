import { describe, expect, it } from 'vitest'
import { resumeLignes } from './lignesNonReparties'

describe('resumeLignes', () => {
  it('dit les deux quand il y a des actifs et des prêts : « 2 actifs et 1 prêt »', () => {
    expect(resumeLignes({ actifs: 2, prets: 1 })).toBe('2 actifs et 1 prêt')
  })

  it("n'écrit que les actifs quand il n'y a aucun prêt, sans « et » ni « 0 prêt »", () => {
    expect(resumeLignes({ actifs: 12, prets: 0 })).toBe('12 actifs')
    expect(resumeLignes({ actifs: 1, prets: 0 })).toBe('1 actif')
  })

  it("n'écrit que les prêts quand il n'y a aucun actif", () => {
    expect(resumeLignes({ actifs: 0, prets: 3 })).toBe('3 prêts')
  })

  it('accorde chaque nombre séparément : « 1 actif et 2 prêts »', () => {
    expect(resumeLignes({ actifs: 1, prets: 2 })).toBe('1 actif et 2 prêts')
  })
})
