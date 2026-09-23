import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Compte, HoldingDetail } from '../api/types'
import Card from './Card'
import { PrimaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import InfoBulle from './InfoBulle'
import { SkeletonTexte } from './Skeleton'
import { useEditeurQuotites } from '../hooks/useEditeurQuotites'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

/** Répartition entre détenteurs (backlog 2.L.1) — n'apparaît que si l'utilisateur a
 * déclaré au moins un détenteur (Réglages). Gère son propre état, indépendant du
 * `detail` du composant parent : après enregistrement, recharge la fiche pour
 * obtenir la part détenue/nette à jour sans faire remonter l'état au parent.
 * `compte` (backlog X.4) : purement informatif, un simple renvoi vers la fiche du
 * compte quand cette ligne en a un — la répartition qui s'y fait s'applique à TOUTES
 * les lignes du compte en une fois, alternative à cette saisie ligne par ligne. */
export default function DetenteursSection({
  holdingId,
  quotitesInitiales,
  compte,
}: {
  holdingId: number
  quotitesInitiales: HoldingDetail['quotites']
  compte?: Compte | null
}) {
  const { montantsMasques } = usePreferencesAffichage()
  const [quotitesEnregistrees, setQuotitesEnregistrees] = useState(quotitesInitiales)
  const { detenteurs, erreurChargement, rechargerDetenteurs, saisie, setValeur, total, totalValide, saving, error, handleSave } =
    useEditeurQuotites({
      enregistrer: (quotites) => api.setHoldingQuotites(holdingId, quotites),
      valeursInitiales: quotitesInitiales,
      // Seul des trois éditeurs à recharger : l'endpoint de la fiche renvoie les
      // parts détenue/nette recalculées, que ce bloc affiche.
      apresEnregistrement: async () => {
        const detailFrais = await api.getHoldingDetail(holdingId)
        setQuotitesEnregistrees(detailFrais.quotites)
      },
    })

  if (erreurChargement !== null) {
    return (
      <Card title={t('detenteursSection.detenteurs')}>
        <EtatErreur message={t('detenteursSection.erreurDetenteurs', { erreur: erreurChargement })} onReessayer={rechargerDetenteurs} />
      </Card>
    )
  }
  if (detenteurs === null) return <SkeletonTexte lignes={2} />
  if (detenteurs.length === 0) return null

  return (
    <Card title={t('detenteursSection.detenteurs')}>
      <p className="mb-4 text-sm text-texte">{t('detenteursSection.repartitionDeCetteLigneEntre')}{compte && (
          <>
            {' '}{t('detenteursSection.cetteLigneAppartientAuCompte')}{' '}
            <Link to={`/comptes/${compte.id}`} className="font-medium text-accent hover:underline">
              {compte.nom}
            </Link>{' '}{t('detenteursSection.definisLaPlutotUneSeule')}</>
        )}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bordure text-left text-xs font-medium uppercase text-texte-attenue">
            <th className="py-2 pr-4">{t('detenteursSection.detenteur')}</th>
            <th className="py-2 pr-4">{t('detenteursSection.quotite')}{' '}
              <InfoBulle texte={t('detenteursSection.laPartDuGateauQui')} />
            </th>
            {/* « Part détenue » / « Part nette » : deux notions proches et
                systématiquement confondues sans explication (recette du
                02/09/2026) — elles ne diffèrent QUE si un emprunt est rattaché. */}
            <th className="py-2 pr-4 text-right" title={t('detenteursSection.valeurDeLActifRevenant')}>{t('detenteursSection.partDetenue')}</th>
            <th
              className="py-2 pr-4 text-right"
              title={t('detenteursSection.partDetenueMoinsLaPart')}
            >{t('detenteursSection.partNette')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bordure">
          {detenteurs.map((d) => {
            const enregistree = quotitesEnregistrees.find((q) => q.detenteur_id === d.id)
            return (
              <tr key={d.id}>
                <td className="py-2 pr-4 text-texte">{d.nom}</td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={saisie[d.id] ?? ''}
                    onChange={(e) => setValeur(d.id, e.target.value)}
                    className="w-20 rounded-control border border-bordure bg-surface px-2 py-1 text-sm text-texte"
                  />
                  %
                </td>
                <td className="py-2 pr-4 text-right text-texte">
                  {enregistree ? formatEuro(enregistree.part_detenue, 2, montantsMasques) : '—'}
                </td>
                <td className="py-2 pr-4 text-right font-medium text-texte">
                  {enregistree ? formatEuro(enregistree.part_nette, 2, montantsMasques) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-4 flex items-center gap-3">
        <PrimaryButton onClick={handleSave} disabled={!totalValide || saving}>{t('detenteursSection.enregistrer')}</PrimaryButton>
        {!totalValide && <span className="text-sm text-negatif">{t('detenteursSection.totalActuel')}{' '}{total.toFixed(2)}{' '}{t('detenteursSection.doitFaire100')}</span>}
        {error && <span className="text-sm text-negatif">{error}</span>}
      </div>
    </Card>
  )
}
