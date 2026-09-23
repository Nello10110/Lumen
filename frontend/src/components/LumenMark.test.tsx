import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LumenMark from './LumenMark'

describe('LumenMark', () => {
  it("deux logos sur la même page n'ont aucun identifiant de dégradé en commun", () => {
    // Avec des `id` fixes, chaque logo peignait avec les dégradés du PREMIER de la
    // page — masqué sur mobile (barre latérale) : les autres n'affichaient plus qu'un
    // arc de couleur unie (constaté le 23/09/2026 sur l'accueil vide).
    const { container } = render(
      <>
        <LumenMark />
        <LumenMark />
      </>,
    )
    const [premier, second] = Array.from(container.querySelectorAll('svg')).map((svg) =>
      Array.from(svg.querySelectorAll('[id]')).map((e) => e.id),
    )

    expect(premier).toHaveLength(3)
    expect(premier.filter((id) => second.includes(id))).toEqual([])
    // Chaque logo référence SES dégradés, et ceux-là seulement.
    for (const svg of container.querySelectorAll('svg')) {
      const ids = new Set(Array.from(svg.querySelectorAll('[id]')).map((e) => e.id))
      for (const forme of svg.querySelectorAll('[fill^="url(#"]')) {
        expect(ids.has(forme.getAttribute('fill')!.slice(5, -1))).toBe(true)
      }
    }
  })
})
