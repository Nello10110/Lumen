import { useCallback, useEffect, useState } from 'react'
import { apiOperateur } from '../../api/client'
import type { FoyerOperateur } from '../../api/types'
import { formatDate, formatDateHeure } from '../../utils/format'
import Card from '../Card'
import { SecondaryButton } from '../Controls'
import EtatErreur from '../EtatErreur'
import EtatVide from '../EtatVide'
import { Badge } from '../Field'
import { SkeletonTexte } from '../Skeleton'
import ConfirmationParSaisieModale from './ConfirmationParSaisieModale'
import DesignerProprietaireModale from './DesignerProprietaireModale'
import { t } from '../../i18n'

/** Les foyers de l'installation, vus par l'opérateur (backlog § BK.2d) : nom, statut, création,
 * propriétaire, nombre de comptes, dernière activité — jamais un montant. Pour chacun :
 * suspendre (les comptes du foyer perdent aussitôt l'accès, les données restent intactes) ou
 * réactiver, désigner un nouveau propriétaire parmi les membres, supprimer (irréversible,
 * confirmé en saisissant le nom du foyer). Aucun aperçu de ce qui serait effacé : compter des
 * lignes de patrimoine, c'en serait déjà voir. Les comptes ne sont jamais supprimés avec le
 * foyer : ils restent, sans foyer s'ils n'avaient que celui-là (`onFoyerSupprime` prévient la
 * liste des comptes sans foyer, qui vient de s'allonger). */
export default function FoyersOperateurCard({ onFoyerSupprime }: { onFoyerSupprime?: () => void }) {
  const [foyers, setFoyers] = useState<FoyerOperateur[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState<number | null>(null)
  const [aSupprimer, setASupprimer] = useState<FoyerOperateur | null>(null)
  const [pourProprietaire, setPourProprietaire] = useState<FoyerOperateur | null>(null)

  const charger = useCallback(() => {
    setErreur(null)
    apiOperateur
      .listFoyers()
      .then(setFoyers)
      .catch((err: Error) => setErreur(err.message))
  }, [])

  useEffect(charger, [charger])

  function remplacer(foyer: FoyerOperateur) {
    setFoyers((avant) => avant?.map((f) => (f.id === foyer.id ? foyer : f)) ?? null)
  }

  async function basculer(foyer: FoyerOperateur) {
    setOccupe(foyer.id)
    setErreur(null)
    try {
      remplacer(foyer.statut === 'actif' ? await apiOperateur.suspendreFoyer(foyer.id) : await apiOperateur.reactiverFoyer(foyer.id))
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setOccupe(null)
    }
  }

  return (
    <Card title={t('foyersOperateur.titre')}>
      <p className="mb-4 text-sm text-texte-attenue">{t('foyersOperateur.intro')}</p>

      {foyers === null ? (
        erreur ? null : <SkeletonTexte />
      ) : foyers.length === 0 ? (
        <EtatVide titre={t('foyersOperateur.aucunFoyer')} description={t('foyersOperateur.aucunFoyerAide')} />
      ) : (
        <ul className="divide-y divide-bordure">
          {foyers.map((foyer) => {
            const nom = foyer.nom ?? t('foyersOperateur.sansNom')
            const suspendu = foyer.statut === 'suspendu'
            return (
              <li key={foyer.id} className="flex flex-col gap-2 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-texte">{nom}</span>
                  <Badge ton={suspendu ? 'avertissement' : 'positif'}>
                    {suspendu ? t('foyersOperateur.statutSuspendu') : t('foyersOperateur.statutActif')}
                  </Badge>
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-0.5 text-xs text-texte-attenue sm:grid-cols-2">
                  <div className="flex gap-1.5">
                    <dt>{t('foyersOperateur.proprietaire')}</dt>
                    <dd className="text-texte">{foyer.proprietaire ?? t('foyersOperateur.aucunProprietaire')}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>{t('foyersOperateur.comptes')}</dt>
                    <dd className="text-texte">{foyer.nombre_comptes}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>{t('foyersOperateur.creeLe')}</dt>
                    <dd className="text-texte">{formatDate(foyer.cree_le)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>{t('foyersOperateur.derniereActivite')}</dt>
                    <dd className="text-texte">
                      {foyer.derniere_activite ? formatDateHeure(foyer.derniere_activite) : t('foyersOperateur.jamais')}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <SecondaryButton onClick={() => void basculer(foyer)} disabled={occupe === foyer.id}>
                    {suspendu ? t('foyersOperateur.reactiver') : t('foyersOperateur.suspendre')}
                  </SecondaryButton>
                  <SecondaryButton onClick={() => setPourProprietaire(foyer)}>{t('foyersOperateur.designerProprietaire')}</SecondaryButton>
                  <SecondaryButton onClick={() => setASupprimer(foyer)} className="text-negatif hover:bg-neg-bg">
                    {t('foyersOperateur.supprimer')}
                  </SecondaryButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {erreur && <EtatErreur message={erreur} onReessayer={charger} />}

      {aSupprimer && (
        <ConfirmationParSaisieModale
          titre={t('foyersOperateur.supprimerTitre', { foyer: aSupprimer.nom ?? t('foyersOperateur.sansNom') })}
          explication={t('foyersOperateur.supprimerExplication')}
          phrase={aSupprimer.confirmation_attendue}
          libelleBouton={t('foyersOperateur.supprimerDefinitivement')}
          onConfirmer={async (confirmation) => {
            await apiOperateur.supprimerFoyer(aSupprimer.id, confirmation)
            setASupprimer(null)
            charger()
            onFoyerSupprime?.()
          }}
          onClose={() => setASupprimer(null)}
        />
      )}
      {pourProprietaire && (
        <DesignerProprietaireModale
          foyer={pourProprietaire}
          onDesigne={(foyer) => {
            remplacer(foyer)
            setPourProprietaire(null)
          }}
          onClose={() => setPourProprietaire(null)}
        />
      )}
    </Card>
  )
}
