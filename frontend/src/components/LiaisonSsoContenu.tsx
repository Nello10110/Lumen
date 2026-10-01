import type { LiaisonSso } from '../hooks/useLiaisonSso'
import { PrimaryButton, SecondaryButton } from './Controls'
import { t } from '../i18n'

/** Le texte et les boutons de « Lier mon compte SSO » / « Délier » (backlog § BK.2d), partagés
 * par la carte de Réglages et la fenêtre du menu du compte : l'état vient de `useLiaisonSso`. */
export default function LiaisonSsoContenu({ liaison }: { liaison: LiaisonSso }) {
  const { lie, fournisseur, enCours, erreur, lier, delier } = liaison
  return (
    <>
      {lie ? (
        <>
          <p className="text-sm text-texte">{t('liaisonSso.lie', { fournisseur })}</p>
          <p className="mt-1 text-xs text-texte-attenue">{t('liaisonSso.delierExplication')}</p>
          <div className="mt-4">
            <SecondaryButton onClick={() => void delier()} disabled={enCours}>
              {t('liaisonSso.delier')}
            </SecondaryButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-texte">{t('liaisonSso.nonLie', { fournisseur })}</p>
          <p className="mt-1 text-xs text-texte-attenue">{t('liaisonSso.lierExplication', { fournisseur })}</p>
          <div className="mt-4">
            <PrimaryButton onClick={() => void lier()} disabled={enCours}>
              {t('liaisonSso.lier')}
            </PrimaryButton>
          </div>
        </>
      )}
      {erreur && <p className="mt-3 text-sm text-negatif">{erreur}</p>}
    </>
  )
}
