import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { PatrimoineHistoryPoint } from '../api/types'
import type { Lentille } from '../contexts/preferencesAffichageContextObject'
import { bornesPeriode, variationSurPeriode } from '../utils/periode'
import { usePreferencesAffichage } from './usePreferencesAffichage'

// Même correspondance lentille -> champ que `PatrimoineNetCard.TUILE_PRINCIPALE` —
// c'est délibérément le MÊME chiffre principal que celui affiché en gros sur le
// tableau de bord, pas une redéfinition parallèle qui pourrait diverger.
const VALEUR_PAR_LENTILLE: Record<Lentille, (p: PatrimoineHistoryPoint) => number> = {
  net: (p) => p.patrimoine_net,
  brut: (p) => p.actifs_totaux,
  financier: (p) => p.patrimoine_financier,
}

/** Variation (%) du patrimoine sur la lentille/période/détenteur actuellement
 * affichés (backlog § AD.2, 15/09/2026) — réutilise les préférences globales
 * (`usePreferencesAffichage`, partagées avec le tableau de bord et le Rapport)
 * plutôt qu'un état parallèle, pour que le halo du logo (`Sidebar.tsx`) reflète
 * exactement ce que l'utilisateur regarde par ailleurs.
 *
 * `null` : donnée pas encore chargée, échec réseau, ou pas assez de points sur la
 * période pour calculer une variation (`variationSurPeriode`, cf. `utils/periode.ts`)
 * — toujours silencieux, jamais remonté à l'utilisateur : une erreur ici ne doit
 * dégrader que la seule décoration du logo, jamais le reste de l'écran. */
export function useVariationPatrimoine(): number | null {
  const { lentille, periode, detenteurId } = usePreferencesAffichage()
  const [variation, setVariation] = useState<number | null>(null)

  useEffect(() => {
    let annule = false
    api
      .getPatrimoineHistory(detenteurId)
      .then((res) => {
        if (annule) return
        const bornes = bornesPeriode(periode)
        const points = res.points
          .filter((p) => !bornes || (p.date >= bornes.dateDebut && p.date <= bornes.dateFin))
          .map((p) => ({ valeur: VALEUR_PAR_LENTILLE[lentille](p) }))
        setVariation(variationSurPeriode(points))
      })
      .catch(() => {
        if (!annule) setVariation(null)
      })
    return () => {
      annule = true
    }
  }, [lentille, periode, detenteurId])

  return variation
}
