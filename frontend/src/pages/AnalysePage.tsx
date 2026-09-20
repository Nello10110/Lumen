import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AnalysisResponse, CoutGestionConsolide, IndicateursSituation, PerformanceSummary } from '../api/types'
import AllocationChartCard from '../components/AllocationChartCard'
import CompositionModal from '../components/CompositionModal'
import { SecondaryButton, SegmentedControl } from '../components/Controls'
import CoutGestionCard from '../components/CoutGestionCard'
import EtatErreur from '../components/EtatErreur'
import EvolutionFinanciereCard from '../components/EvolutionFinanciereCard'
import ExpositionConsolideeCard from '../components/ExpositionConsolideeCard'
import { IconDividendes, IconEvolution, IconMaison, IconObjectifs, IconPatrimoine } from '../components/icons'
import IndicateursSituationCard from '../components/IndicateursSituationCard'
import MetriquesAvanceesCard from '../components/MetriquesAvanceesCard'
import PerformanceCard from '../components/PerformanceCard'
import QualiteDonneesCard from '../components/QualiteDonneesCard'
import RevenusSection from '../components/RevenusSection'
import ScorePatrimonialCard from '../components/ScorePatrimonialCard'
import SimulateurAchatLocationCard from '../components/SimulateurAchatLocationCard'
import SimulateurProjectionSection from '../components/SimulateurProjectionSection'
import { SkeletonTexte } from '../components/Skeleton'
import StatTile from '../components/StatTile'
import { useAuth } from '../hooks/useAuth'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro } from '../utils/format'

type OngletKey = 'portefeuille' | 'evolution' | 'revenus' | 'simulateur' | 'projection'

const ONGLETS: { key: OngletKey; label: string; Icone: typeof IconPatrimoine }[] = [
  { key: 'portefeuille', label: 'Portefeuille', Icone: IconPatrimoine },
  { key: 'evolution', label: 'Évolution', Icone: IconEvolution },
  { key: 'revenus', label: 'Revenus', Icone: IconDividendes },
  { key: 'simulateur', label: 'Achat vs location', Icone: IconMaison },
  { key: 'projection', label: 'Simulateur', Icone: IconObjectifs },
]

const ONGLET_PAR_DEFAUT: OngletKey = 'portefeuille'

/** Écran « Analyse » (réorganisation du 07/09/2026, demande directe de
 * l'utilisateur : « je veux un écran d'accueil un peu plus light »).
 *
 * Rassemble ce qui était dispersé entre le repli « Détail » du tableau de bord et
 * l'ancien écran Dividendes. Le tableau de bord ne garde que ce qui répond à la
 * question qu'on se pose en ouvrant l'application — combien, et dans quel sens ça
 * va ; tout ce qui répond à « pourquoi » et « de quoi est-ce fait » vit ici.
 *
 * Plusieurs onglets, chacun une question distincte : **Portefeuille** (de quoi le
 * patrimoine est-il fait, comment se comporte-t-il, ce qu'il coûte — complété le
 * 16/09/2026 par les indicateurs de situation, cf. plus bas), **Évolution**
 * (retour utilisateur du 13/09/2026 — le graphique héros du tableau de bord, mais
 * filtrable par classe d'actif/établissement/compte et sur une fourchette de dates
 * précise, cf. `EvolutionFinanciereCard`), **Revenus** (ce qu'il rapporte sans qu'on
 * le vende), **Achat vs location** et **Simulateur** (projection de patrimoine et
 * indépendance financière, `SimulateurProjectionSection` — vivait jusqu'au
 * 16/09/2026 fusionné avec le suivi d'objectifs sur `/objectifs`, sans jamais en
 * partager la moindre donnée ; déplacé ici, à côté de son cousin « et si... » Achat
 * vs location. La clé d'onglet `simulateur` désigne toujours ce dernier —
 * antérieure à ce déplacement — pas le nouvel onglet Simulateur, dont la clé est
 * `projection`). Sélection portée par l'URL (`?onglet=…`, même patron que
 * `ReglagesPage`) : un lien direct vers un onglet précis reste possible et le retour
 * navigateur le restitue.
 *
 * `IndicateursSituationCard` (matelas de sécurité, taux d'endettement, part
 * immobilisée, backlog 2.O.2) rejoint l'onglet Portefeuille le 16/09/2026 : le
 * suivi d'objectifs qui l'hébergeait jusque-là (`/objectifs`) a été retiré (retour
 * utilisateur direct : « on pourrait tout supprimer » — la fonctionnalité avait
 * perdu son intérêt, cf. `docs/BACKLOG.md` § AJ), mais ces indicateurs de santé
 * financière restent pertinents indépendamment de tout objectif suivi. Réservés au
 * propriétaire côté backend (même restriction que les autres réglages financiers
 * sensibles) — `AnalysePage` n'interroge donc l'API que pour ce rôle et gate le
 * rendu de la carte, plutôt que de déplacer tout l'onglet derrière cette
 * restriction.
 *
 * L'ancienne URL `/dividendes` redirige ici (cf. `App.tsx`) — les marque-pages
 * survivent au renommage. Depuis le 16/09/2026, `/simulateur` y redirige aussi
 * (`?onglet=projection`). */
export default function AnalysePage() {
  const { montantsMasques } = usePreferencesAffichage()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const ongletParam = searchParams.get('onglet') as OngletKey | null
  const onglet = ONGLETS.some((o) => o.key === ongletParam) ? (ongletParam as OngletKey) : ONGLET_PAR_DEFAUT

  function setOnglet(suivant: OngletKey) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (suivant === ONGLET_PAR_DEFAUT) next.delete('onglet')
      else next.set('onglet', suivant)
      return next
    })
  }

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Rentabilité et coût de gestion (backlog 2.K.5) : chacun son propre état
  // chargement/erreur — indépendants d'`analysis` ci-dessus, un échec de l'un ne doit
  // ni bloquer ni masquer silencieusement les autres.
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null)
  const [chargementPerformance, setChargementPerformance] = useState(true)
  const [erreurPerformance, setErreurPerformance] = useState<string | null>(null)

  const [coutGestion, setCoutGestion] = useState<CoutGestionConsolide | null>(null)
  const [chargementCoutGestion, setChargementCoutGestion] = useState(true)
  const [erreurCoutGestion, setErreurCoutGestion] = useState<string | null>(null)

  // Indicateurs de situation (backlog 2.O.2) : réservés au propriétaire côté
  // backend (`GET /api/analysis/indicateurs-situation`) — n'interroge donc
  // l'API que pour ce rôle, jamais pour un membre qui recevrait de toute façon
  // un 403.
  const [indicateurs, setIndicateurs] = useState<IndicateursSituation | null>(null)

  const [modal, setModal] = useState<{ type: 'geo' | 'sector'; categorie: string } | null>(null)

  function chargerPerformance() {
    setChargementPerformance(true)
    setErreurPerformance(null)
    api
      .getPerformance()
      .then(setPerformance)
      .catch((err) => setErreurPerformance(err.message))
      .finally(() => setChargementPerformance(false))
  }

  function chargerCoutGestion() {
    setChargementCoutGestion(true)
    setErreurCoutGestion(null)
    api
      .getCoutGestionConsolide()
      .then(setCoutGestion)
      .catch((err) => setErreurCoutGestion(err.message))
      .finally(() => setChargementCoutGestion(false))
  }

  function chargerDonnees() {
    setLoading(true)
    setError(null)
    api
      .getAnalysis()
      .then(setAnalysis)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    chargerPerformance()
    chargerCoutGestion()
    if (user?.role === 'proprietaire') {
      api.getIndicateursSituation().then(setIndicateurs).catch(() => setIndicateurs(null))
    }
  }

  useEffect(chargerDonnees, [user?.role])

  return (
    <div className="space-y-[14px]">
      <div className="flex items-center justify-end gap-3 md:justify-between">
        <h1 className="hidden text-[28px] font-semibold tracking-title text-ink md:block">Analyse</h1>
        <SecondaryButton onClick={chargerDonnees} disabled={loading}>
          {loading ? 'Actualisation...' : 'Actualiser'}
        </SecondaryButton>
      </div>

      <SegmentedControl
        options={ONGLETS.map(({ key, label, Icone }) => ({
          valeur: key,
          libelle: (
            <span className="flex items-center gap-1.5">
              <Icone className="h-4 w-4" />
              {label}
            </span>
          ),
        }))}
        valeur={onglet}
        onChange={setOnglet}
        ariaLabel="Sections de l'analyse"
        semantique="onglets"
        idOnglet={(v) => `onglet-${v}`}
        idPanneau={(v) => `panneau-${v}`}
        className="max-w-full flex-nowrap overflow-x-auto md:w-fit md:overflow-visible"
      />

      {onglet === 'evolution' && (
        <div id="panneau-evolution" role="tabpanel" aria-labelledby="onglet-evolution">
          <EvolutionFinanciereCard />
        </div>
      )}

      {onglet === 'revenus' && (
        <div id="panneau-revenus" role="tabpanel" aria-labelledby="onglet-revenus">
          <RevenusSection />
        </div>
      )}

      {onglet === 'simulateur' && (
        <div id="panneau-simulateur" role="tabpanel" aria-labelledby="onglet-simulateur">
          <SimulateurAchatLocationCard />
        </div>
      )}

      {onglet === 'projection' && (
        <div id="panneau-projection" role="tabpanel" aria-labelledby="onglet-projection">
          <SimulateurProjectionSection />
        </div>
      )}

      {onglet === 'portefeuille' && (
        <div id="panneau-portefeuille" role="tabpanel" aria-labelledby="onglet-portefeuille" className="space-y-[14px]">
          {loading && <SkeletonTexte lignes={4} />}
          {error && <EtatErreur message={error} onReessayer={chargerDonnees} />}

          {chargementPerformance && <SkeletonTexte lignes={2} />}
          {erreurPerformance && <EtatErreur message={erreurPerformance} onReessayer={chargerPerformance} />}
          {!chargementPerformance && !erreurPerformance && performance && performance.nombre_transactions > 0 && (
            <PerformanceCard performance={performance} />
          )}
          {/* Indépendante de `PerformanceCard` ci-dessus (retour utilisateur du
              09/09/2026) : en lentille "brut"/"net", cette carte peut avoir quelque
              chose à montrer (immobilier/épargne) même sans aucune transaction
              financière — la gate sur `nombre_transactions`, pertinente pour
              `PerformanceCard` (XIRR financier), masquerait alors à tort la seule
              carte capable de comparer le patrimoine combiné à un indice. La carte
              gère déjà elle-même l'historique insuffisant (`EtatVide`). */}
          {!chargementPerformance && !erreurPerformance && <MetriquesAvanceesCard />}

          {!loading && !error && analysis && (
            <>
              <div className="grid grid-cols-2 gap-[14px] md:grid-cols-4">
                <StatTile label="Valeur des positions" value={formatEuro(analysis.valeur_totale, 0, montantsMasques)} />
                <StatTile
                  label="Score de diversification"
                  value={`${analysis.risques.score_diversification}/100`}
                  tone={analysis.risques.score_diversification < 50 ? 'warning' : 'good'}
                />
                <StatTile
                  label="Plus grosse ligne"
                  value={`${analysis.risques.top_ligne_poids}%`}
                  sub={analysis.risques.top_ligne_nom ?? undefined}
                  tone={analysis.risques.top_ligne_poids > 20 ? 'warning' : 'neutral'}
                />
                <StatTile
                  label="Concentration géographique"
                  value={`${analysis.risques.top_pays_poids}%`}
                  sub={analysis.risques.top_pays_nom ?? undefined}
                  tone={analysis.risques.top_pays_poids > 60 ? 'warning' : 'neutral'}
                />
              </div>

              <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
                <AllocationChartCard
                  title="Répartition géographique"
                  items={analysis.geo}
                  onCategoryClick={(categorie) => setModal({ type: 'geo', categorie })}
                  footnote={
                    <p className="mt-2 text-xs text-texte-attenue">
                      Géographie des fonds/ETF issue de leur composition réelle (10 plus grosses lignes, extrapolées à 100% du
                      fonds) quand Yahoo Finance la fournit, sinon estimée à partir de l'indice suivi par le fonds (voir le détail
                      de qualité des données ci-dessous) ; secteur des fonds basé sur leur composition complète. Clique sur une
                      barre (ou une ligne du tableau en plein écran) pour voir le détail des lignes.
                    </p>
                  }
                />
                <AllocationChartCard
                  title="Répartition sectorielle"
                  items={analysis.sector}
                  onCategoryClick={(categorie) => setModal({ type: 'sector', categorie })}
                />
              </div>

              <QualiteDonneesCard qualite={analysis.qualite_donnees} />
            </>
          )}

          <ExpositionConsolideeCard />

          <ScorePatrimonialCard />

          {chargementCoutGestion && <SkeletonTexte lignes={2} />}
          {erreurCoutGestion && <EtatErreur message={erreurCoutGestion} onReessayer={chargerCoutGestion} />}
          {!chargementCoutGestion && !erreurCoutGestion && coutGestion && <CoutGestionCard cout={coutGestion} />}

          {user?.role === 'proprietaire' && indicateurs && <IndicateursSituationCard indicateurs={indicateurs} />}

          {modal && (
            <CompositionModal
              categorie={modal.categorie}
              sousTitre={modal.type === 'geo' ? 'Répartition géographique' : 'Répartition sectorielle'}
              fetchComposition={(categorie) => api.getCategoryComposition(modal.type, categorie)}
              onClose={() => setModal(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}
