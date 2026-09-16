import type { ReactNode } from 'react'
import { useRafraichissementCoursEtat } from '../hooks/useRafraichissementCoursEtat'
import { RafraichissementCoursContext } from './rafraichissementCoursContextObject'

/** Retour utilisateur du 16/09/2026 : « il faut que ça continue quand on change de
 * page, mais pas que ça coupe ». Avant ce Provider, `useRafraichissementCours`
 * portait son état (sondage inclus) dans un `useState` LOCAL à chaque composant qui
 * l'appelait (bouton Portefeuille, bouton Tableau de bord, chaque `JobCard` de
 * Réglages) — un rafraîchissement en tâche de fond côté backend (déjà découplé de
 * toute requête HTTP, cf. `market_data_refresh.py`) perdait pourtant tout son suivi
 * dès que l'utilisateur quittait la page qui l'avait déclenché : le composant qui
 * sondait `GET /api/market-data/refresh/status` démontait son `useEffect`, plus
 * personne ne savait quand c'était terminé.
 *
 * Monté une seule fois dans `App.tsx` (`AppAuthentifiee`, aux côtés de
 * `PreferencesAffichageProvider`), ce Provider porte désormais CETTE instance
 * unique de sondage — elle survit à la navigation puisque `AppAuthentifiee` ne
 * démonte jamais entre deux pages de l'application authentifiée. Chaque écran
 * continue d'appeler `useRafraichissementCours` normalement (API inchangée) ; c'est
 * lui qui choisit désormais de lire cet état partagé plutôt que d'en recréer un.
 *
 * Voir aussi `RafraichissementCoursIndicateur.tsx` : la bannière persistante
 * (montée aux côtés de ce Provider) qui rend la progression/fin visible quel que
 * soit l'écran affiché — sans elle, ce Provider corrigerait le suivi en silence
 * mais l'utilisateur n'aurait toujours aucun moyen de VOIR que c'est fini. */
export function RafraichissementCoursProvider({ children }: { children: ReactNode }) {
  const moteur = useRafraichissementCoursEtat()
  return <RafraichissementCoursContext.Provider value={moteur}>{children}</RafraichissementCoursContext.Provider>
}
