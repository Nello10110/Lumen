import { describe, expect, it } from 'vitest'
import { delaiAvantEssai, DUREE_MAX_REESSAIS_MS, peutReessayer } from './reconnexionServeur'

describe('reconnexion automatique — rythme des essais', () => {
  it("l'attente double à chaque essai (1 s, 2 s, 4 s, 8 s) puis plafonne à 10 s", () => {
    expect([0, 1, 2, 3, 4, 5, 20].map(delaiAvantEssai)).toEqual([1000, 2000, 4000, 8000, 10_000, 10_000, 10_000])
  })

  it('cesse de réessayer seul une fois les 2 minutes cumulées dépassées', () => {
    expect(peutReessayer(0)).toBe(true)
    expect(peutReessayer(10)).toBe(true)
    // 1+2+4+8 = 15 s pour les quatre premiers, puis 10 s chacun : le 14e essai dépasse 120 s.
    expect(peutReessayer(13)).toBe(true)
    expect(peutReessayer(14)).toBe(false)
    expect(DUREE_MAX_REESSAIS_MS).toBe(120_000)
  })
})
