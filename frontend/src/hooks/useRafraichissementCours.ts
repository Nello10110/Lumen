import { useContext, useEffect, useRef } from 'react'
import type { EtatRafraichissement } from '../api/types'
import { RafraichissementCoursContext } from '../contexts/rafraichissementCoursContextObject'
import { useRafraichissementCoursEtat } from './useRafraichissementCoursEtat'

/** Suit un rafraîchissement des cours en tâche de fond (LOT 4B) : `etat`/`enCours`
 * consultables, `declencher(action)` pour en démarrer un.
 *
 * Lit `RafraichissementCoursContext` (`App.tsx` monte son Provider une seule fois,
 * au-dessus de toutes les pages authentifiées) — c'est ce qui permet au suivi de
 * survivre à la navigation (retour utilisateur du 16/09/2026, cf. la docstring de
 * `RafraichissementCoursContext.tsx`). `repli` ci-dessous, un second moteur
 * TOUJOURS instancié (règle des Hooks : jamais d'appel de Hook conditionnel), n'est
 * utilisé que si aucun Provider n'englobe ce composant — c'est le cas de tests
 * unitaires qui rendent une page isolément, sans reconstituer tout `App.tsx`. Ce
 * repli ne coûte rien en production (Provider toujours présent) : son `etat` reste
 * `null` pour toujours puisque rien n'appelle jamais son propre `declencher`.
 *
 * `onTermine`, optionnel, est appelé une seule fois par transition « en cours ->
 * terminé » RÉELLEMENT NOUVELLE pour CETTE instance (dédupliquée par identité
 * d'objet, `dernierEtatNotifie`) — jamais rejoué pour un état déjà terminé au
 * moment du montage (ex. `JobCard` remonté après navigation, alors qu'un
 * rafraîchissement s'est terminé pendant que l'écran n'était pas affiché : chaque
 * écran recharge de toute façon ses propres données à son montage, inutile de
 * rejouer ce callback pour une fin déjà ancienne). */
export function useRafraichissementCours(onTermine?: (etat: EtatRafraichissement) => void) {
  const ctx = useContext(RafraichissementCoursContext)
  const repli = useRafraichissementCoursEtat()
  const { etat, declenchementEnCours, erreur, declencher } = ctx ?? repli

  const onTermineRef = useRef(onTermine)
  onTermineRef.current = onTermine
  const dernierEtatNotifie = useRef(etat)

  useEffect(() => {
    if (!etat || etat.en_cours) return
    if (dernierEtatNotifie.current === etat) return
    dernierEtatNotifie.current = etat
    onTermineRef.current?.(etat)
  }, [etat])

  return { etat, enCours: declenchementEnCours || (etat?.en_cours ?? false), erreur, declencher }
}
