import { describe, expect, it } from 'vitest'
import { styleHaloLumen } from './lumenHalo'

describe('styleHaloLumen (backlog § AD.2 — halo réactif du logo)', () => {
  it("ne pose aucun filtre quand la variation est inconnue (donnée pas encore chargée)", () => {
    expect(styleHaloLumen(null)).toEqual({})
  })

  it('pose un halo vert en hausse, jamais de rouge', () => {
    const style = styleHaloLumen(10)
    expect(style.filter).toContain('drop-shadow')
    expect(style.filter).toContain('rgba(15, 122, 79')
    expect(style.filter).not.toMatch(/rgba\(192, 57, 45|red/i) // --negatif, jamais utilisé ici
  })

  it("plafonne l'intensité au-delà de l'amplitude plafond (pas de halo grotesque sur une variation extrême)", () => {
    const styleModere = styleHaloLumen(20)
    const styleExtreme = styleHaloLumen(500)
    expect(styleExtreme).toEqual(styleModere)
  })

  it('désature/assombrit en baisse, sans jamais poser de couleur (pas de rouge alarmant)', () => {
    const style = styleHaloLumen(-10)
    expect(style.filter).toContain('saturate')
    expect(style.filter).toContain('brightness')
    expect(style.filter).not.toContain('rgba')
  })

  it('une variation nulle (0%) reste traitée comme une hausse (halo vert minimal), jamais comme une baisse', () => {
    const style = styleHaloLumen(0)
    expect(style.filter).toContain('drop-shadow')
  })
})
