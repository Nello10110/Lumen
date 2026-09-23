import type { CoutGestionConsolide } from '../api/types'
import Card from './Card'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

/** Coût de gestion annuel consolidé des fonds/ETF détenus (roadmap Phase 3, § E.3) —
 * somme des TER pondérés par la valeur de chaque ligne. N'affiche rien tant qu'aucun
 * fonds n'est détenu (`valeur_fonds === 0`). */
export default function CoutGestionCard({ cout }: { cout: CoutGestionConsolide }) {
  const { montantsMasques } = usePreferencesAffichage()
  if (cout.valeur_fonds === 0) return null

  return (
    <Card title={t('coutGestionCard.coutDeGestionAnnuelEstime')}>
      <p className="text-3xl font-semibold text-texte">{formatEuro(cout.cout_annuel_estime, 2, montantsMasques)}</p>
      <p className="mt-1 text-sm text-texte-attenue">{t('coutGestionCard.sur')}{' '}{formatEuro(cout.valeur_fonds, 0, montantsMasques)}{' '}{t('coutGestionCard.deFondsEtfDetenusDont')}{' '}{cout.couverture_pct}{t('coutGestionCard.avecDesFraisDeGestion')}</p>
      {cout.couverture_pct < 100 && (
        <p className="mt-3 text-xs text-texte-attenue">{t('coutGestionCard.les')}{' '}{formatEuro(cout.valeur_fonds - cout.valeur_fonds_avec_ter_connu, 0, montantsMasques)}{' '}{t('coutGestionCard.restantsNOntPasEncore')}</p>
      )}
    </Card>
  )
}
