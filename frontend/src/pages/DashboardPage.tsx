import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { PatrimoineHistoryPoint, PortfolioHistoryPoint } from '../api/types'
import Card from '../components/Card'
import { SecondaryButton } from '../components/Controls'
import PatrimoineNetCard from '../components/PatrimoineNetCard'
import PortfolioHistoryChart, { ControlesCourbe } from '../components/PortfolioHistoryChart'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { useRafraichissementCours } from '../hooks/useRafraichissementCours'
import { parseDateApi } from '../utils/format'

// Backlog § AF.4 (15/09/2026) — au-delà de ce nombre de jours sans qu'AUCUNE
// position cotée n'ait été retouchée par un rafraîchissement (réussi ou en échec —
// `MarketDataCache.derniere_maj` avance dans les deux cas, ce qui reste le bon
// signal ici : « a-t-on RETENTÉ récemment », pas « a-t-on réussi »), l'encart
// apparaît. 3 jours : assez pour ne jamais s'afficher à qui rafraîchit ne
// serait-ce qu'occasionnellement, assez tôt pour ne pas laisser les cours dormir
// des semaines sans un rappel.
const SEUIL_JOURS_SANS_RAFRAICHISSEMENT = 3

/** Écran d'accueil — délibérément court (demande directe de l'utilisateur du
 * 07/09/2026 : « je veux un écran d'accueil un peu plus light »).
 *
 * Il ne répond qu'à la question qu'on se pose en ouvrant l'application : combien, et
 * dans quel sens ça va. Le chiffre, sa variation, la courbe, les trois poches et la
 * répartition par type — rien d'autre.
 *
 * Tout le reste (rentabilité, métriques avancées, répartitions géographique et
 * sectorielle, qualité des données, exposition consolidée, coût de gestion, revenus)
 * a rejoint l'écran `Analyse`, où il est rangé par question plutôt qu'empilé sous un
 * repli « Détail » que personne n'ouvrait. Trois appels réseau coûteux
 * (`/analysis`, `/performance`, `/analysis/cout-gestion`) partent avec lui : cet
 * écran ne charge plus que les deux historiques dont dépend la courbe, et la liste
 * des positions pour savoir si le portefeuille est vide. */
export default function DashboardPage() {
  const { detenteurId } = usePreferencesAffichage()

  // Mode étagé porté ici plutôt que dans le graphique : sa pilule vit dans l'en-tête
  // du bloc héros (maquette), rendue par `PatrimoineNetCard`, alors que le tracé
  // qu'elle pilote est plus bas. Un seul état pour les deux.
  const [modeEtage, setModeEtage] = useState(false)

  // Historique du portefeuille (backlog 2.K.6) : remonté ici plutôt que chargé dans
  // `PortfolioHistoryChart` lui-même — partagé avec `PatrimoineNetCard` (variation
  // affichée sur le chiffre principal), un seul appel réseau pour les deux. Endpoint
  // coûteux (jusqu'à une minute), chargé une seule fois au montage.
  const [historique, setHistorique] = useState<PortfolioHistoryPoint[] | null>(null)
  const [chargementHistorique, setChargementHistorique] = useState(true)
  const [erreurHistorique, setErreurHistorique] = useState<string | null>(null)

  // Historique combiné financier + immobilier/épargne − emprunts (feature Net/Brut/
  // Financier sur toute la page Synthèse) — même philosophie que `historique`
  // ci-dessus (partagé entre `PatrimoineNetCard` et `PortfolioHistoryChart`), mais
  // rechargé quand `detenteurId` change (la série diffère selon la vue).
  const [patrimoineHistorique, setPatrimoineHistorique] = useState<PatrimoineHistoryPoint[] | null>(null)
  const [chargementPatrimoineHistorique, setChargementPatrimoineHistorique] = useState(true)
  const [erreurPatrimoineHistorique, setErreurPatrimoineHistorique] = useState<string | null>(null)

  // Portefeuille vide : la liste des positions suffit à le savoir. `/analysis`, qui
  // portait cette information jusqu'ici, agrège en plus les compositions de fonds et
  // les répartitions — beaucoup de travail serveur pour une question binaire, et il
  // n'a plus de raison d'être appelé depuis cet écran.
  const [portefeuilleVide, setPortefeuilleVide] = useState(false)

  // Backlog § AF.4 : nombre de jours écoulés depuis le rafraîchissement le plus
  // ANCIEN parmi les positions cotées (`market_data` non nul — un bien immobilier
  // ou un livret saisis à la main n'ont simplement rien à rafraîchir) — la ligne la
  // plus endormie fixe le message, pas une moyenne qui masquerait une position
  // vraiment oubliée derrière des positions à jour. `null` = rien à signaler
  // (aucune position cotée, ou toutes rafraîchies récemment).
  const [joursSansRafraichissement, setJoursSansRafraichissement] = useState<number | null>(null)
  const { enCours: rafraichissementEnCours, declencher: declencherRafraichissement } = useRafraichissementCours(chargerPortefeuilleVide)

  function chargerHistorique() {
    setChargementHistorique(true)
    setErreurHistorique(null)
    api
      .getPortfolioHistory()
      .then((res) => setHistorique(res.points))
      .catch((err) => setErreurHistorique(err.message))
      .finally(() => setChargementHistorique(false))
  }

  function chargerPatrimoineHistorique() {
    setChargementPatrimoineHistorique(true)
    setErreurPatrimoineHistorique(null)
    api
      .getPatrimoineHistory(detenteurId)
      .then((res) => setPatrimoineHistorique(res.points))
      .catch((err) => setErreurPatrimoineHistorique(err.message))
      .finally(() => setChargementPatrimoineHistorique(false))
  }

  // Silencieux en cas d'échec : ces deux drapeaux ne pilotent que des encarts
  // d'invitation. Une erreur réseau ne doit faire apparaître ni « aucune
  // position » ni « cours endormis » à quelqu'un qui n'est concerné par aucun des
  // deux — l'absence d'encart est le repli sûr dans les deux cas.
  function chargerPortefeuilleVide() {
    api
      .listHoldings()
      .then((lignes) => {
        setPortefeuilleVide(lignes.length === 0)
        const dernieresMaj = lignes
          .map((h) => h.market_data?.derniere_maj)
          .filter((d): d is string => d != null)
          // `parseDateApi`, jamais `new Date(d)` directement : l'API renvoie un
          // horodatage UTC SANS indication de fuseau (ex. "2026-09-21T09:00:00"),
          // que `new Date` lirait comme une heure LOCALE — décalant le calcul de
          // l'heure du fuseau du navigateur et faussant le nombre de jours affiché
          // (bug constaté : l'encart restait affiché même juste après un
          // rafraîchissement réel).
          .map((d) => parseDateApi(d).getTime())
        if (dernieresMaj.length === 0) {
          setJoursSansRafraichissement(null)
          return
        }
        const plusAncienne = Math.min(...dernieresMaj)
        const jours = Math.floor((Date.now() - plusAncienne) / (1000 * 60 * 60 * 24))
        setJoursSansRafraichissement(jours >= SEUIL_JOURS_SANS_RAFRAICHISSEMENT ? jours : null)
      })
      .catch(() => {
        setPortefeuilleVide(false)
        setJoursSansRafraichissement(null)
      })
  }

  function chargerDonnees() {
    chargerHistorique()
    chargerPatrimoineHistorique()
    chargerPortefeuilleVide()
  }

  useEffect(chargerHistorique, [])
  useEffect(chargerPortefeuilleVide, [])
  useEffect(chargerPatrimoineHistorique, [detenteurId])

  const chargement = chargementHistorique || chargementPatrimoineHistorique

  return (
    <div className="space-y-[14px]">
      <div className="flex items-center justify-end md:justify-between">
        <h1 className="hidden text-[28px] font-semibold tracking-title text-ink md:block">Tableau de bord</h1>
        <SecondaryButton onClick={chargerDonnees} disabled={chargement} className="min-h-11 md:min-h-0">
          {chargement ? 'Actualisation...' : 'Actualiser'}
        </SecondaryButton>
      </div>

      <PatrimoineNetCard
        historiquePortefeuille={{ points: historique, loading: chargementHistorique }}
        historiquePatrimoine={{ points: patrimoineHistorique, loading: chargementPatrimoineHistorique }}
        controlesCourbe={<ControlesCourbe stacked={modeEtage} onStackedChange={setModeEtage} />}
        courbe={
          <PortfolioHistoryChart
            stacked={modeEtage}
            points={historique}
            loading={chargementHistorique}
            error={erreurHistorique}
            onRetry={chargerHistorique}
            pointsPatrimoine={patrimoineHistorique}
            loadingPatrimoine={chargementPatrimoineHistorique}
            errorPatrimoine={erreurPatrimoineHistorique}
            onRetryPatrimoine={chargerPatrimoineHistorique}
          />
        }
      />

      {/* Encart d'appel à l'action, pas de l'information complémentaire : il reste
          sur l'écran d'accueil quand tout le reste part. */}
      {portefeuilleVide && (
        <Card className="border-warn/25 bg-warn-bg">
          <p className="text-sm text-warn">
            Aucune position dans le portefeuille. Commence par{' '}
            <Link to="/import" className="font-medium underline">
              importer ton portefeuille
            </Link>
            .
          </p>
        </Card>
      )}

      {/* Backlog § AF.4 (15/09/2026) : rappel discret si les cours n'ont pas été
          rafraîchis depuis longtemps. Ton neutre (pas d'orange d'alerte comme
          l'encart ci-dessus) : rien n'est cassé, c'est une invitation, pas un
          problème à résoudre. Le bouton déclenche le MÊME rafraîchissement que
          celui de Portefeuille (`useRafraichissementCours`, § AH.2) — la ligne se
          rallume aussi ici pendant l'attente puisque c'est le même hook. */}
      {joursSansRafraichissement !== null && !portefeuilleVide && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-texte-attenue">
              Vos cours dorment depuis {joursSansRafraichissement} jour{joursSansRafraichissement > 1 ? 's' : ''} — les
              rallumer&nbsp;?
            </p>
            <SecondaryButton
              onClick={() => declencherRafraichissement(() => api.refreshMarketData())}
              disabled={rafraichissementEnCours}
            >
              {rafraichissementEnCours ? 'Rallumage...' : 'Rallumer les cours'}
            </SecondaryButton>
          </div>
        </Card>
      )}

      {/* Le contenu déplacé doit rester trouvable depuis l'endroit d'où il vient :
          sans ce lien, quelqu'un qui consultait la répartition sectorielle sous le
          repli « Détail » n'aurait aucun moyen de deviner où elle est passée. */}
      <p className="text-[13px] text-ink3">
        Répartitions, rentabilité, qualité des données et revenus ont leur écran :{' '}
        <Link to="/analyse" className="font-medium text-accent hover:underline">
          voir l'analyse détaillée
        </Link>
        .
      </p>
    </div>
  )
}
