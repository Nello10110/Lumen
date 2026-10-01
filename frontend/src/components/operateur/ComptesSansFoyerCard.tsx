import { useCallback, useEffect, useState } from 'react'
import { apiOperateur } from '../../api/client'
import type { CompteSansFoyer } from '../../api/types'
import { formatDate, formatDateHeure } from '../../utils/format'
import Card from '../Card'
import { SecondaryButton } from '../Controls'
import EtatErreur from '../EtatErreur'
import EtatVide from '../EtatVide'
import { SkeletonTexte } from '../Skeleton'
import ConfirmationParSaisieModale from './ConfirmationParSaisieModale'
import { t } from '../../i18n'

/** Les comptes qui n'appartiennent à aucun foyer (backlog § BK.2d) : ils se connectent mais
 * n'ont rien à voir — le dernier foyer supprimé, ou quitté, les laisse là. Un compte n'est
 * supprimé que par lui-même ou, s'il n'a plus de foyer, par l'opérateur : ici, avec son journal
 * d'accès et ses sessions, confirmé en saisissant son nom d'utilisateur. Un compte qui a un
 * foyer ne figure pas dans cette liste, et le serveur refuserait de le supprimer (409). */
export default function ComptesSansFoyerCard() {
  const [comptes, setComptes] = useState<CompteSansFoyer[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [aSupprimer, setASupprimer] = useState<CompteSansFoyer | null>(null)

  const charger = useCallback(() => {
    setErreur(null)
    apiOperateur
      .listComptesSansFoyer()
      .then(setComptes)
      .catch((err: Error) => setErreur(err.message))
  }, [])

  useEffect(charger, [charger])

  return (
    <Card title={t('comptesSansFoyer.titre')}>
      <p className="mb-4 text-sm text-texte-attenue">{t('comptesSansFoyer.intro')}</p>

      {comptes === null ? (
        erreur ? null : <SkeletonTexte lignes={2} />
      ) : comptes.length === 0 ? (
        <EtatVide titre={t('comptesSansFoyer.aucun')} />
      ) : (
        <ul className="divide-y divide-bordure">
          {comptes.map((compte) => (
            <li key={compte.id} className="flex flex-col gap-1.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-texte">{compte.username}</p>
                <p className="mt-0.5 text-xs text-texte-attenue">
                  {t('comptesSansFoyer.creeLe', { date: formatDate(compte.created_at) })} ·{' '}
                  {compte.derniere_connexion
                    ? t('comptesSansFoyer.derniereConnexion', { date: formatDateHeure(compte.derniere_connexion) })
                    : t('comptesSansFoyer.jamaisConnecte')}
                </p>
              </div>
              <SecondaryButton
                onClick={() => setASupprimer(compte)}
                className="text-negatif hover:bg-neg-bg"
                title={t('comptesSansFoyer.supprimerAria', { nom: compte.username })}
              >
                {t('comptesSansFoyer.supprimer')}
              </SecondaryButton>
            </li>
          ))}
        </ul>
      )}
      {erreur && <EtatErreur message={erreur} onReessayer={charger} />}

      {aSupprimer && (
        <ConfirmationParSaisieModale
          titre={t('comptesSansFoyer.supprimerTitre', { nom: aSupprimer.username })}
          explication={t('comptesSansFoyer.supprimerExplication')}
          phrase={aSupprimer.username}
          libelleBouton={t('comptesSansFoyer.supprimerDefinitivement')}
          onConfirmer={async (confirmation) => {
            await apiOperateur.supprimerCompteSansFoyer(aSupprimer.id, confirmation)
            setASupprimer(null)
            charger()
          }}
          onClose={() => setASupprimer(null)}
        />
      )}
    </Card>
  )
}
