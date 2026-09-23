import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { RevenusPassifsProjetes } from '../api/types'
import Card from './Card'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import { SkeletonTexte } from './Skeleton'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

/** Revenus passifs projetés à 12 mois (backlog 2.P.3, absorbe C.2) : distingue ce
 * qui est CERTAIN (loyers nets, intérêts de livrets — montants déjà connus) de ce
 * qui est ESTIMÉ (dividendes/intérêts de courtage, extrapolés depuis les 12 derniers
 * mois réellement perçus) — jamais un chiffre théorique par titre présenté comme
 * une certitude. */
export default function RevenusPassifsCard() {
  const { montantsMasques } = usePreferencesAffichage()
  const [revenus, setRevenus] = useState<RevenusPassifsProjetes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  function charger() {
    setLoading(true)
    setError(null)
    api
      .getRevenusPassifs()
      .then(setRevenus)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  if (loading) return <SkeletonTexte lignes={3} />
  if (error) return <EtatErreur message={error} onReessayer={charger} />
  if (!revenus) return null

  return (
    <Card title={t('revenusPassifsCard.revenusPassifsProjetes12Mois')}>
      {revenus.revenu_total_projete_annuel === 0 ? (
        <EtatVide
          titre={t('revenusPassifsCard.aucunRevenuPassifDetecte')}
          description={t('revenusPassifsCard.renseigneUnLoyerSurUne')}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('revenusPassifsCard.projectionAnnuelle')}</p>
              <p className="mt-1 text-2xl font-semibold text-texte">
                {formatEuro(revenus.revenu_total_projete_annuel, 0, montantsMasques)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-texte-attenue">{t('revenusPassifsCard.projectionMensuelle')}</p>
              <p className="mt-1 text-2xl font-semibold text-texte">
                {formatEuro(revenus.revenu_total_projete_mensuel, 0, montantsMasques)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-bordure pt-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-positif">{t('revenusPassifsCard.certain')}</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-texte-attenue">{t('revenusPassifsCard.loyersNets')}</span>
                  <span className="font-medium text-texte">{formatEuro(revenus.loyers_nets_annuels, 0, montantsMasques)}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-texte-attenue">{t('revenusPassifsCard.interetsDeLivrets')}</span>
                  <span className="font-medium text-texte">
                    {formatEuro(revenus.interets_livrets_annuels, 0, montantsMasques)}
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-avertissement">{t('revenusPassifsCard.estime12DerniersMoisExtrapoles')}</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-texte-attenue">{t('revenusPassifsCard.dividendes')}</span>
                  <span className="font-medium text-texte">
                    {formatEuro(revenus.dividendes_estimes_annuels, 0, montantsMasques)}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-texte-attenue">{t('revenusPassifsCard.interetsDeCourtage')}</span>
                  <span className="font-medium text-texte">
                    {formatEuro(revenus.interets_courtage_estimes_annuels, 0, montantsMasques)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs text-texte-attenue">{t('revenusPassifsCard.laPartCertaineReposeSur')}</p>
        </>
      )}
    </Card>
  )
}
