import type { CSSProperties } from 'react'

/** Style du halo réactif du logo de la sidebar (backlog § AD.2, 15/09/2026) : en
 * hausse, un halo vert (`--positif`) dont l'intensité croît avec l'amplitude ; en
 * baisse, le logo se désature/s'assombrit légèrement — **jamais de rouge**, sur
 * demande explicite du backlog (« l'app n'est pas là pour stresser »). `null`
 * (donnée pas encore chargée, ou pas assez de points pour une variation) laisse le
 * logo dans son état par défaut, sans filtre.
 *
 * Amplitude plafonnée à `AMPLITUDE_PLAFOND` : au-delà, l'effet visuel n'a plus
 * besoin de croître — même principe que `RAPPORT_MAX_INTERPRETABLE` dans
 * `utils/periode.ts`, un pourcentage extrême sur la période « Tout » ne doit pas
 * produire un halo grotesque.
 *
 * Statique par construction (pas de boucle d'animation) : rien à désactiver pour
 * `prefers-reduced-motion`, contrairement à `animate-lumen-allumage`. */
const AMPLITUDE_PLAFOND = 20

export function styleHaloLumen(variationPct: number | null): CSSProperties {
  if (variationPct === null) return {}

  if (variationPct >= 0) {
    const intensite = Math.min(variationPct, AMPLITUDE_PLAFOND) / AMPLITUDE_PLAFOND
    const flou = 4 + intensite * 10 // 4 à 14px
    const opacite = 0.3 + intensite * 0.4 // 0.3 à 0.7
    return { filter: `drop-shadow(0 0 ${flou.toFixed(1)}px rgba(15, 122, 79, ${opacite.toFixed(2)}))` }
  }

  const intensite = Math.min(Math.abs(variationPct), AMPLITUDE_PLAFOND) / AMPLITUDE_PLAFOND
  const saturation = 1 - intensite * 0.5 // 1 à 0.5
  const luminosite = 1 - intensite * 0.25 // 1 à 0.75
  return { filter: `saturate(${saturation.toFixed(2)}) brightness(${luminosite.toFixed(2)})` }
}
