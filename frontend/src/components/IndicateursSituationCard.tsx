import type { IndicateursSituation } from '../api/types'
import Card from './Card'
import StatTile from './StatTile'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro, formatPct } from '../utils/format'
import { t } from '../i18n'

/** Matelas de sécurité, taux d'endettement, part du patrimoine immobilisée
 * (backlog 2.O.2) — anciennement rattachés à l'écran Objectifs, déplacés dans
 * Analyse le 16/09/2026 (retour utilisateur : le suivi d'objectifs avait perdu
 * son intérêt, cf. `docs/BACKLOG.md` § AJ ; ces indicateurs de santé
 * financière restent en revanche pertinents indépendamment de tout objectif
 * suivi). Réservé au propriétaire (`GET /api/analysis/indicateurs-situation`,
 * même restriction que les autres réglages financiers sensibles) — `AnalysePage`
 * gate ce rendu, jamais ce composant lui-même. */
export default function IndicateursSituationCard({ indicateurs }: { indicateurs: IndicateursSituation }) {
  const { montantsMasques } = usePreferencesAffichage()

  return (
    <Card title={t('indicateursSituationCard.indicateursDeSituation')}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={t('indicateursSituationCard.matelasDeSecurite')}
          value={indicateurs.matelas_securite_mois !== null ? `${indicateurs.matelas_securite_mois} mois` : '—'}
          sub={t('indicateursSituationCard.epargneDisponibleDepensesMensuelles')}
        />
        <StatTile
          label={t('indicateursSituationCard.tauxDEndettement')}
          value={indicateurs.taux_endettement_pct !== null ? formatPct(indicateurs.taux_endettement_pct) : '—'}
          sub={t('indicateursSituationCard.mensualitesRevenusNets')}
          tone={indicateurs.taux_endettement_pct !== null && indicateurs.taux_endettement_pct > 35 ? 'warning' : 'neutral'}
        />
        <StatTile
          label={t('indicateursSituationCard.partDuPatrimoineImmobilisee')}
          value={indicateurs.part_immobilisee_pct !== null ? formatPct(indicateurs.part_immobilisee_pct) : '—'}
          sub={t('indicateursSituationCard.actifsNonLiquidesPatrimoineBrut')}
        />
      </div>
      {(indicateurs.matelas_securite_mois === null || indicateurs.taux_endettement_pct === null) && (
        <p className="mt-3 text-xs text-texte-attenue">{t('indicateursSituationCard.necessiteDesMouvementsBancairesImportes')}{' '}
          {formatEuro(indicateurs.epargne_disponible, 0, montantsMasques)}{' '}{t('indicateursSituationCard.dEpargneDisponibleDetectee')}{' '}
          {formatEuro(indicateurs.mensualites_totales, 0, montantsMasques)}{' '}{t('indicateursSituationCard.deMensualitesDEmprunts')}</p>
      )}
    </Card>
  )
}
