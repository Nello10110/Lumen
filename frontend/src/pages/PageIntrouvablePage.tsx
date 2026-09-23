import { Link } from 'react-router-dom'
import EtatVide from '../components/EtatVide'
import { t } from '../i18n'

/** Route `*` (backlog § AD.3, 15/09/2026) — jusqu'ici une URL inconnue tombait sur
 * un cadre vide (aucune `<Route>` ne correspondait), sans jamais planter (l'ossature
 * — Sidebar/BottomNav — reste montée autour) mais sans le moindre message non plus.
 * `e2e/sweep-ecrans.spec.ts` vérifiait déjà l'absence d'écran blanc ; cette page lui
 * donne enfin un contenu explicite. */
export default function PageIntrouvablePage() {
  return (
    <div className="p-6">
      <EtatVide
        titre={t('pageIntrouvablePage.aucuneLumiereParIci')}
        description={
          <>{t('pageIntrouvablePage.cettePageNExistePas')}{' '}
            <Link to="/" className="font-medium text-accent hover:underline">{t('pageIntrouvablePage.retourAuTableauDeBord')}</Link>
            .
          </>
        }
      />
    </div>
  )
}
