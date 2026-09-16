import { useEffect, useState } from 'react'
import { api } from '../api/client'

/** Backlog § AG.5 (16/09/2026, reformulée le même jour) — tendance générale du
 * patrimoine sur TOUT l'historique (pas la lentille/période affichée ailleurs :
 * cet effet d'ambiance répond à « comment ça va globalement », pas à ce qui est
 * affiché à l'instant sur un écran précis) : premier point contre dernier point de
 * `patrimoine_net`.
 *
 * DÉLIBÉRÉMENT distinct du hook `useVariationPatrimoine` retiré le 16/09/2026
 * (§ AD.2, halo du logo — retour utilisateur : « ça rend pas bien ») : plus
 * simple (une tendance haussière/baissière, pas un pourcentage d'amplitude), et
 * réservé à un usage à peine perceptible (fond d'ambiance), jamais un élément
 * fixement regardé comme l'était le logo. `null` tant que la donnée n'est pas
 * chargée, en erreur, ou insuffisante (moins de 2 points) — état par défaut,
 * sans ambiance. */
export type Tendance = 'hausse' | 'baisse' | null

/** `active` : `App.tsx` l'appelle inconditionnellement dès le premier rendu de
 * `AppAuthentifiee` (règle des Hooks — jamais un appel conditionnel), y compris
 * pendant le chargement de la connexion ou avant qu'un `user` n'existe. Sans ce
 * garde-fou, l'effet partirait pour tout le monde, jeton valide ou non. */
export function useTendancePatrimoine(active: boolean): Tendance {
  const [tendance, setTendance] = useState<Tendance>(null)

  useEffect(() => {
    if (!active) return
    api
      .getPatrimoineHistory(null)
      .then((res) => {
        const points = res.points
        if (points.length < 2) return
        const premier = points[0].patrimoine_net
        const dernier = points[points.length - 1].patrimoine_net
        setTendance(dernier > premier ? 'hausse' : dernier < premier ? 'baisse' : null)
      })
      .catch(() => setTendance(null))
  }, [active])

  return tendance
}
