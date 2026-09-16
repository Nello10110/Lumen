import type { IndicateursSituation } from '../api/types'
import Card from './Card'
import StatTile from './StatTile'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro, formatPct } from '../utils/format'

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
    <Card title="Indicateurs de situation">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Matelas de sécurité"
          value={indicateurs.matelas_securite_mois !== null ? `${indicateurs.matelas_securite_mois} mois` : '—'}
          sub="épargne disponible / dépenses mensuelles"
        />
        <StatTile
          label="Taux d'endettement"
          value={indicateurs.taux_endettement_pct !== null ? formatPct(indicateurs.taux_endettement_pct) : '—'}
          sub="mensualités / revenus nets"
          tone={indicateurs.taux_endettement_pct !== null && indicateurs.taux_endettement_pct > 35 ? 'warning' : 'neutral'}
        />
        <StatTile
          label="Part du patrimoine immobilisée"
          value={indicateurs.part_immobilisee_pct !== null ? formatPct(indicateurs.part_immobilisee_pct) : '—'}
          sub="actifs non liquides / patrimoine brut"
        />
      </div>
      {(indicateurs.matelas_securite_mois === null || indicateurs.taux_endettement_pct === null) && (
        <p className="mt-3 text-xs text-texte-attenue">
          Nécessite des mouvements bancaires importés (écran Budget) sur les 3 derniers mois pour estimer dépenses et revenus.
          {' '}
          {formatEuro(indicateurs.epargne_disponible, 0, montantsMasques)} d'épargne disponible détectée,{' '}
          {formatEuro(indicateurs.mensualites_totales, 0, montantsMasques)} de mensualités d'emprunts.
        </p>
      )}
    </Card>
  )
}
