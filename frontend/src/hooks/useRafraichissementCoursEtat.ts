import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { EtatRafraichissement } from '../api/types'

// Retour utilisateur du 16/09/2026 (§AT.x, fix animation ligne par ligne) : sondage
// plus rapproché qu'avant (2000ms) pour permettre un allumage plus granulaire des
// lignes du Portefeuille pendant le rafraîchissement — cf. `PortefeuillePage.tsx`.
const INTERVALLE_SONDAGE_MS = 600

export interface MoteurRafraichissementCours {
  etat: EtatRafraichissement | null
  declenchementEnCours: boolean
  erreur: string | null
  declencher: (action: () => Promise<unknown>) => Promise<void>
}

/** Moteur d'état brut (sondage + déclenchement), sans notion d'`onTermine` — c'est
 * le composant partagé entre `RafraichissementCoursProvider` (l'instance unique,
 * globale) et le repli local de `useRafraichissementCours` (cf. sa docstring). */
export function useRafraichissementCoursEtat(): MoteurRafraichissementCours {
  const [etat, setEtat] = useState<EtatRafraichissement | null>(null)
  const [declenchementEnCours, setDeclenchementEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!etat?.en_cours) return
    const intervalle = window.setInterval(async () => {
      try {
        setEtat(await api.getRefreshStatus())
      } catch (err) {
        setErreur((err as Error).message)
      }
    }, INTERVALLE_SONDAGE_MS)
    return () => window.clearInterval(intervalle)
  }, [etat?.en_cours])

  async function declencher(action: () => Promise<unknown>) {
    setErreur(null)
    setDeclenchementEnCours(true)
    try {
      await action()
      setEtat(await api.getRefreshStatus())
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setDeclenchementEnCours(false)
    }
  }

  return { etat, declenchementEnCours, erreur, declencher }
}
