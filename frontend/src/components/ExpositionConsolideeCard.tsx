import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ExpositionConsolidee } from '../api/types'
import Card from './Card'
import CompositionModal from './CompositionModal'
import EtatErreur from './EtatErreur'
import EtatVide from './EtatVide'
import PieChartCard from './PieChartCard'
import StatTile from './StatTile'
import { SkeletonGraphique } from './Skeleton'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro, formatPourcent } from '../utils/format'
import { t } from '../i18n'
import { libelleDonnee } from '../i18n/donnees'

/** Exposition consolidée tous actifs (backlog 2.P.1) : une seule répartition
 * géo/classe, financier ET immobilier/épargne confondus — jamais servie ailleurs
 * dans l'application (`AnalysisResponse` reste scopé au seul portefeuille
 * financier). Affichée sur l'écran Analyse, onglet Portefeuille.
 *
 * Suit la lentille Net/Brut/Financier (backlog 2.S.2, retour utilisateur 26/08/2026) :
 * Brut affiche la valeur brute de chaque ligne, Net la nette de son emprunt rattaché
 * (mêmes champs `_nette` que `PatrimoineNetCard`). En Financier, la carte est masquée
 * plutôt que de montrer une pseudo-exposition "tous actifs" restreinte au seul
 * financier — ce serait contradictoire avec son titre et redondant avec les cartes
 * Répartition géographique/sectorielle déjà financières juste au-dessus. */
export default function ExpositionConsolideeCard() {
  const { lentille, montantsMasques } = usePreferencesAffichage()
  const [donnees, setDonnees] = useState<ExpositionConsolidee | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [modal, setModal] = useState<{ dimension: 'geo' | 'classe'; categorie: string } | null>(null)

  function charger() {
    setLoading(true)
    setErreur(null)
    api
      .getExpositionConsolidee()
      .then(setDonnees)
      .catch((err) => setErreur((err as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(charger, [])

  if (lentille === 'financier') return null

  const enNet = lentille === 'net'
  const valeurTotale = donnees ? (enNet ? donnees.valeur_totale_nette : donnees.valeur_totale) : 0
  const repartitionGeo = donnees ? (enNet ? donnees.repartition_geo_nette : donnees.repartition_geo) : []
  const repartitionClasse = donnees ? (enNet ? donnees.repartition_classe_nette : donnees.repartition_classe) : []
  const plusGrosseLigneTicker = donnees ? (enNet ? donnees.plus_grosse_ligne_ticker_nette : donnees.plus_grosse_ligne_ticker) : null
  const plusGrosseLignePct = donnees ? (enNet ? donnees.plus_grosse_ligne_pct_nette : donnees.plus_grosse_ligne_pct) : null
  const top5LignesPct = donnees ? (enNet ? donnees.top5_lignes_pct_nette : donnees.top5_lignes_pct) : null
  const premiereZoneGeo = donnees ? (enNet ? donnees.premiere_zone_geo_nette : donnees.premiere_zone_geo) : null
  const premiereZoneGeoPct = donnees ? (enNet ? donnees.premiere_zone_geo_pct_nette : donnees.premiere_zone_geo_pct) : null
  const partEstimeeManuellePct = donnees ? (enNet ? donnees.part_estimee_manuelle_pct_nette : donnees.part_estimee_manuelle_pct) : 0

  if (loading) return <SkeletonGraphique hauteur={320} />
  if (erreur) return <EtatErreur message={erreur} onReessayer={charger} />
  if (!donnees) return null

  if (valeurTotale === 0) {
    return (
      <Card title={t('expositionConsolideeCard.expositionConsolideeTousActifs')}>
        <EtatVide titre={t('expositionConsolideeCard.aucunActifValorise')} description={t('expositionConsolideeCard.importeUnHistoriqueDeTransactions')} />
      </Card>
    )
  }

  return (
    <div className="space-y-[14px]">
      {/* Chaque bloc est sa propre carte (`PieChartCard` s'enveloppe déjà lui-même,
          comme partout ailleurs dans l'app) : les imbriquer dans une carte englobante
          empilerait deux panneaux de verre flous l'un dans l'autre. */}
      <Card title={t('expositionConsolideeCard.expositionConsolideeTousActifs')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile
            label={t('expositionConsolideeCard.plusGrosseLigne')}
            value={plusGrosseLigneTicker ?? '—'}
            sub={plusGrosseLignePct !== null ? t('expositionConsolideeCard.pctDuPatrimoine', { pct: formatPourcent(plusGrosseLignePct) }) : undefined}
          />
          <StatTile label={t('expositionConsolideeCard.top5Lignes')} value={top5LignesPct !== null ? formatPourcent(top5LignesPct) : '—'} sub={t('expositionConsolideeCard.duPatrimoineTotal')} />
          <StatTile
            label={t('expositionConsolideeCard.premiereZoneGeographique')}
            value={premiereZoneGeo ? libelleDonnee(premiereZoneGeo) : '—'}
            sub={premiereZoneGeoPct !== null ? t('expositionConsolideeCard.pctDuPatrimoine', { pct: formatPourcent(premiereZoneGeoPct) }) : undefined}
          />
        </div>
        <p className="mt-4 text-xs text-texte-attenue">{t('expositionConsolideeCard.valeurTotaleConsolidee')}{enNet ? t('expositionConsolideeCard.netteDesEmpruntsRattachesA') : t('expositionConsolideeCard.valeurBrute')} :{' '}
          {formatEuro(valeurTotale, 0, montantsMasques)}.{' '}
          {partEstimeeManuellePct > 0 &&
            t('expositionConsolideeCard.partDeclaree', { pct: partEstimeeManuellePct })}
        </p>
      </Card>

      {/* `repartition_geo`/`repartition_classe` (et leurs variantes `_nette`)
          n'incluent jamais de catégorie à valeur <= 0 (`compute_exposition_consolidee`
          les exclut — pas de liste ici, contrairement à `PatrimoineNetCard`, pour
          afficher une équité négative en repli). */}
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <PieChartCard
          title={t('expositionConsolideeCard.repartitionGeographiqueConsolidee')}
          items={repartitionGeo.map((i) => ({ categorie: i.categorie, poids: i.valeur / valeurTotale }))}
          onCategoryClick={(categorie) => setModal({ dimension: 'geo', categorie })}
        />
        <PieChartCard
          title={t('expositionConsolideeCard.repartitionParClasseDActif')}
          items={repartitionClasse.map((i) => ({ categorie: i.categorie, poids: i.valeur / valeurTotale }))}
          onCategoryClick={(categorie) => setModal({ dimension: 'classe', categorie })}
        />
      </div>

      {modal && (
        <CompositionModal
          categorie={modal.categorie}
          sousTitre={modal.dimension === 'geo' ? t('expositionConsolideeCard.repartitionGeographiqueConsolidee') : t('expositionConsolideeCard.repartitionParClasseDActif')}
          fetchComposition={(categorie) => api.getExpositionConsolideeComposition(modal.dimension, categorie, enNet)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
