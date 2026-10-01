import type { LiaisonSso } from '../hooks/useLiaisonSso'
import { SecondaryButton } from './Controls'
import LiaisonSsoContenu from './LiaisonSsoContenu'
import Modale from './Modale'
import { t } from '../i18n'

/** « Connexion SSO » du menu du compte (backlog § BK.2d), pour un membre ou un invité — qui n'ont
 * pas Réglages, où le propriétaire trouve `LiaisonSsoCard`. Même contenu, même logique : la
 * `liaison` vient de `useLiaisonSso`, appelée par le menu qui décide d'afficher l'entrée. */
export default function LiaisonSsoModale({ liaison, onClose }: { liaison: LiaisonSso; onClose: () => void }) {
  return (
    <Modale onClose={onClose}>
      {({ titleId }) => (
        <div>
          <h2 id={titleId} className="mb-3 text-lg font-semibold text-ink">
            {t('liaisonSso.titre')}
          </h2>
          <LiaisonSsoContenu liaison={liaison} />
          <div className="mt-5 flex justify-end">
            <SecondaryButton onClick={onClose}>{t('liaisonSso.fermer')}</SecondaryButton>
          </div>
        </div>
      )}
    </Modale>
  )
}
