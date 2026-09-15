import { Link } from 'react-router-dom'
import EtatVide from '../components/EtatVide'

/** Route `*` (backlog § AD.3, 15/09/2026) — jusqu'ici une URL inconnue tombait sur
 * un cadre vide (aucune `<Route>` ne correspondait), sans jamais planter (l'ossature
 * — Sidebar/BottomNav — reste montée autour) mais sans le moindre message non plus.
 * `e2e/sweep-ecrans.spec.ts` vérifiait déjà l'absence d'écran blanc ; cette page lui
 * donne enfin un contenu explicite. */
export default function PageIntrouvablePage() {
  return (
    <div className="p-6">
      <EtatVide
        titre="Aucune lumière par ici."
        description={
          <>
            Cette page n'existe pas.{' '}
            <Link to="/" className="font-medium text-accent hover:underline">
              Retour au tableau de bord
            </Link>
            .
          </>
        }
      />
    </div>
  )
}
