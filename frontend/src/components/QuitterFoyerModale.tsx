import { useState } from 'react'
import { api } from '../api/client'
import { rechargerApplication } from '../auth/changementFoyer'
import { useAuth } from '../hooks/useAuth'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import Modale from './Modale'
import { t } from '../i18n'

/** Confirmation de « Quitter ce foyer » (backlog § BK.2b), pour un membre ou un invité —
 * le propriétaire ne peut pas partir, le serveur le refuse (403).
 *
 * Quitter retire l'appartenance, jamais le compte, même quand c'est le dernier foyer :
 * le compte reste, sans foyer (décision du 30/09/2026). Les données restent au foyer.
 * D'où l'avertissement explicite dans ce cas : on n'aura plus accès à aucune donnée tant
 * qu'on n'aura pas rejoint ou créé un foyer. */
export default function QuitterFoyerModale({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const dernierFoyer = (user?.foyers?.length ?? 0) <= 1

  async function quitter() {
    setEnCours(true)
    setErreur(null)
    try {
      await api.quitterFoyer()
      rechargerApplication()
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  return (
    <Modale onClose={onClose}>
      {({ titleId }) => (
        <div className="space-y-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {t('quitterFoyer.titre')}
          </h2>
          <p className="text-sm text-ink2">{t('quitterFoyer.explication')}</p>
          {dernierFoyer && (
            <p className="rounded-control border border-hairline bg-chip p-3 text-sm text-ink2">{t('quitterFoyer.dernierFoyer')}</p>
          )}
          {erreur && <EtatErreur message={erreur} />}
          <div className="flex justify-end gap-2.5">
            <SecondaryButton onClick={onClose} disabled={enCours}>
              {t('quitterFoyer.annuler')}
            </SecondaryButton>
            <PrimaryButton onClick={() => void quitter()} disabled={enCours}>
              {t('quitterFoyer.confirmer')}
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modale>
  )
}
