import { useEffect, useRef, useState } from 'react'
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

/** Lecture de l'état d'un rafraîchissement : `GET /market-data/refresh/status` pour un
 * foyer, `GET /operateur/etat-rafraichissement` pour l'opérateur (backlog § BK.2d), à qui
 * la première est fermée. */
export type LectureEtatRafraichissement = () => Promise<EtatRafraichissement>

/** Moteur d'état brut (sondage + déclenchement), sans notion d'`onTermine` — c'est
 * le composant partagé entre `RafraichissementCoursProvider` (l'instance unique,
 * globale) et le repli local de `useRafraichissementCours` (cf. sa docstring).
 * `lireEtat` : la route à sonder, celle des foyers par défaut. */
export function useRafraichissementCoursEtat(lireEtat?: LectureEtatRafraichissement): MoteurRafraichissementCours {
  // Lu à chaque appel : le sondage ne doit pas redémarrer si l'appelant passe une autre fonction.
  const lireEtatRef = useRef(lireEtat)
  lireEtatRef.current = lireEtat
  const lire = () => (lireEtatRef.current ?? api.getRefreshStatus)()
  const [etat, setEtat] = useState<EtatRafraichissement | null>(null)
  const [declenchementEnCours, setDeclenchementEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!etat?.en_cours) return
    const intervalle = window.setInterval(async () => {
      try {
        setEtat(await lire())
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
      setEtat(await lire())
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setDeclenchementEnCours(false)
    }
  }

  return { etat, declenchementEnCours, erreur, declencher }
}
