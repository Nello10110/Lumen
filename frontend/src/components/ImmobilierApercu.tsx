import type { Holding, HoldingDetail, ValuationHistoryPoint } from '../api/types'
import Card from './Card'
import { Label } from './Field'
import { ValorisationHistoriqueCard } from './ValorisationHistoriqueCard'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro, formatPct } from '../utils/format'
import { t } from '../i18n'

/** Onglet *Aperçu* de la fiche immobilier (backlog 2.M.4) : cashflow/rentabilités/
 * prix au m² déjà calculés côté serveur, et l'historique daté des valorisations —
 * jamais écrasé, une nouvelle ligne à chaque changement réel de `valeur_estimee`.
 * Remplace la courbe de cours (sans objet pour un bien non coté). */
export default function ImmobilierApercu({
  holdingId,
  immobilier,
  historique,
  onHistoriqueChanged,
  dateAcquisition,
  prixRevientMoyen,
}: {
  holdingId: number
  immobilier: HoldingDetail['immobilier']
  historique: ValuationHistoryPoint[]
  onHistoriqueChanged: (holding: Holding) => void
  dateAcquisition: HoldingDetail['date_acquisition']
  prixRevientMoyen: HoldingDetail['prix_revient_moyen']
}) {
  const { montantsMasques } = usePreferencesAffichage()

  return (
    <>
      {immobilier && (immobilier.cashflow_mensuel !== null || immobilier.prix_m2 !== null || immobilier.prix_acquisition_total !== null) && (
        <Card title={t('immobilierApercu.cashflowEtRentabilite')}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {immobilier.cashflow_mensuel !== null && (
              <div>
                <Label>{t('immobilierApercu.cashflowMensuel')}</Label>
                <p className={`mt-1 text-lg font-semibold ${immobilier.cashflow_mensuel >= 0 ? 'text-positif' : 'text-negatif'}`}>
                  {formatEuro(immobilier.cashflow_mensuel, 2, montantsMasques)}
                </p>
                <p className="mt-1 text-xs text-texte-attenue">{t('immobilierApercu.loyerChargesFrais12Mensualite')}</p>
              </div>
            )}
            {immobilier.rentabilite_brute_pct !== null && (
              <div>
                <Label>{t('immobilierApercu.rentabiliteBrute')}</Label>
                <p className="mt-1 text-lg font-semibold text-texte">{formatPct(immobilier.rentabilite_brute_pct)}</p>
                <p className="mt-1 text-xs text-texte-attenue">{t('immobilierApercu.loyerAnnuelPrixDAcquisition')}</p>
              </div>
            )}
            {immobilier.rentabilite_nette_pct !== null && (
              <div>
                <Label>{t('immobilierApercu.rentabiliteNette')}</Label>
                <p className="mt-1 text-lg font-semibold text-texte">{formatPct(immobilier.rentabilite_nette_pct)}</p>
                <p className="mt-1 text-xs text-texte-attenue">{t('immobilierApercu.loyerChargesFraisPrixD')}</p>
              </div>
            )}
            {immobilier.prix_m2 !== null && (
              <div>
                <Label>{t('immobilierApercu.prixAuM')}</Label>
                <p className="mt-1 text-lg font-semibold text-texte">{formatEuro(immobilier.prix_m2, 2, montantsMasques)}</p>
              </div>
            )}
            {immobilier.emprunt_mensualite !== null && (
              <div>
                <Label>{t('immobilierApercu.mensualiteDeLEmpruntRattache')}</Label>
                <p className="mt-1 text-lg font-semibold text-texte">{formatEuro(immobilier.emprunt_mensualite, 2, montantsMasques)}</p>
              </div>
            )}
            {immobilier.prix_acquisition_total !== null && (
              <div>
                <Label>{t('immobilierApercu.prixDAcquisitionTotal')}</Label>
                <p className="mt-1 text-lg font-semibold text-texte">{formatEuro(immobilier.prix_acquisition_total, 2, montantsMasques)}</p>
                <p className="mt-1 text-xs text-texte-attenue">{t('immobilierApercu.prixDAchatFraisNotaire')}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <ValorisationHistoriqueCard
        holdingId={holdingId}
        historique={historique}
        onChanged={onHistoriqueChanged}
        dateAcquisition={dateAcquisition}
        prixRevientMoyen={prixRevientMoyen}
      />
    </>
  )
}
