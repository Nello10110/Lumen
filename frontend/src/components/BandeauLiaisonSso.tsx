import { createPortal } from 'react-dom'
import type { RetourLiaisonSso } from '../hooks/useRetourLiaisonSso'
import { t } from '../i18n'

/** Message d'issue de « Lier mon compte SSO » (backlog § BK.2d), affiché au retour du
 * fournisseur — succès, ou erreur avec le message du serveur. Posé en bas de l'écran par un
 * portail (même raison que `RafraichissementCoursIndicateur` : un `position: fixed` dans
 * l'arbre pourrait se retrouver enfermé derrière un panneau à `backdrop-filter`) et fermé à la
 * main : un échec doit pouvoir être lu. `null` : rien. */
export default function BandeauLiaisonSso({ retour, onFermer }: { retour: RetourLiaisonSso | null; onFermer: () => void }) {
  if (!retour) return null
  const echec = retour.type === 'erreur'
  return createPortal(
    <output
      className={`fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-panel border px-4 py-3 text-sm shadow-glass-lg backdrop-blur-glass ${
        echec ? 'border-negatif/40 bg-negatif/10 text-negatif' : 'border-stroke bg-panel-hi text-ink'
      }`}
    >
      <span>{echec ? t('liaisonSso.echec', { motif: retour.message }) : t('liaisonSso.reussie')}</span>
      <button type="button" onClick={onFermer} className="shrink-0 font-medium underline">
        {t('liaisonSso.fermer')}
      </button>
    </output>,
    document.body,
  )
}
