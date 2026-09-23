import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import DashboardPage from './DashboardPage'

vi.mock('../api/client', () => ({
  api: {
    // Historique du portefeuille (backlog 2.K.6) : remonté par la page pour être
    // partagé avec `PortfolioHistoryChart`/`PatrimoineNetCard` (tous deux mis de côté
    // ci-dessous) — un seul appel réseau pour les deux.
    getPortfolioHistory: vi.fn().mockResolvedValue({ points: [] }),
    // Historique combiné patrimoine (feature Net/Brut/Financier sur toute la page
    // Synthèse) : même philosophie que ci-dessus.
    getPatrimoineHistory: vi.fn().mockResolvedValue({ points: [] }),
    listHoldings: vi.fn().mockResolvedValue([]),
    // Backlog § AF.4 (révision du 21/09/2026) : date du dernier rafraîchissement
    // réellement tenté, plus interrogée position par position — `null` par
    // défaut (jamais rafraîchi), écrasé dans le describe dédié ci-dessous.
    getDerniereActualisationMarketData: vi.fn().mockResolvedValue({ derniere_actualisation: null }),
    // Backlog § AF.4 : le bouton "Actualiser les cours" de l'encart passe par le
    // même hook que celui de Portefeuille (`useRafraichissementCours`) — non
    // testé en détail ici (déjà couvert par `PortefeuillePage.test.tsx`),
    // résolutions neutres.
    refreshMarketData: vi.fn().mockResolvedValue({ en_cours: false }),
    getRefreshStatus: vi.fn().mockResolvedValue({
      en_cours: false,
      positions_traitees: 0,
      positions_total: 0,
      demarre_le: null,
      termine_le: null,
      statut: null,
      message: null,
    }),
  },
}))

// Composants lourds (recharts, appels réseau propres) mis de côté : ce fichier ne
// verrouille pas leur rendu interne, couvert dans leurs propres fichiers.
vi.mock('../components/PortfolioHistoryChart', () => ({ default: () => <div />, ControlesCourbe: () => <div /> }))
// `etatCarte.vide` : ce que la carte signale à la page (`onVide`) — faux par défaut,
// comme un foyer qui a du patrimoine.
const etatCarte = vi.hoisted(() => ({ vide: false }))
vi.mock('../components/PatrimoineNetCard', async () => {
  const { useEffect } = await import('react')
  function PatrimoineNetCardFactice({ onVide }: { onVide?: (vide: boolean) => void }) {
    useEffect(() => onVide?.(etatCarte.vide), [onVide])
    return <div />
  }
  return { default: PatrimoineNetCardFactice }
})

vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ lentille: 'net', setLentille: vi.fn(), montantsMasques: false, toggleMontantsMasques: vi.fn(), detenteurId: null, setDetenteurId: vi.fn() }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.getPortfolioHistory).mockResolvedValue({ points: [] })
  vi.mocked(api.getPatrimoineHistory).mockResolvedValue({ points: [] })
  vi.mocked(api.listHoldings).mockResolvedValue([])
})

describe('DashboardPage — écran d\'accueil allégé (07/09/2026)', () => {
  it('charge un seul historique de portefeuille, partagé entre le chiffre et la courbe', async () => {
    renderPage()

    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(1))
  })

  it("charge aussi l'historique combiné patrimoine (feature Net/Brut/Financier), scopé par détenteur", async () => {
    renderPage()

    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledWith(null))
  })

  // Le cœur de l'allègement demandé : ces trois appels coûteux ont suivi le contenu
  // qu'ils alimentaient vers l'écran Analyse. Ce test échouerait si l'un revenait ici
  // par mégarde — le mock d'`api` ne les expose même pas.
  it("n'appelle plus l'analyse, la rentabilité ni le coût de gestion", async () => {
    renderPage()

    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalled())
    expect(api).not.toHaveProperty('getAnalysis')
    expect(api).not.toHaveProperty('getPerformance')
    expect(api).not.toHaveProperty('getCoutGestionConsolide')
  })

  it('le bouton Actualiser relance les deux historiques', async () => {
    renderPage()
    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(1))

    fireEvent.click(await screen.findByRole('button', { name: /Actualiser/ }))

    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(2))
    expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(2)
  })

  it("renvoie vers l'écran Analyse, où le détail a été déplacé", async () => {
    renderPage()

    const lien = await screen.findByRole('link', { name: /analyse détaillée/ })
    expect(lien).toHaveAttribute('href', '/analyse')
  })
})

describe('DashboardPage — invitation à importer (portefeuille vide)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getPortfolioHistory).mockResolvedValue({ points: [] })
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue({ points: [] })
  })

  it("propose d'importer quand aucune position n'existe", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([])
    renderPage()

    expect(await screen.findByText(/Aucune position dans le portefeuille/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /importer ton portefeuille/ })).toHaveAttribute('href', '/import')
  })

  it("ne propose rien dès qu'une position existe", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([{ id: 1 } as never])
    renderPage()

    await waitFor(() => expect(api.listHoldings).toHaveBeenCalled())
    expect(screen.queryByText(/Aucune position dans le portefeuille/)).not.toBeInTheDocument()
  })

  // Repli sûr : une panne réseau ne doit pas annoncer « aucune position » à quelqu'un
  // qui en a — l'absence d'encart est le seul état honnête quand on ne sait pas.
  it("n'annonce rien quand l'appel échoue", async () => {
    vi.mocked(api.listHoldings).mockRejectedValue(new Error('panne simulée'))
    renderPage()

    await waitFor(() => expect(api.listHoldings).toHaveBeenCalled())
    expect(screen.queryByText(/Aucune position dans le portefeuille/)).not.toBeInTheDocument()
  })
})

describe("DashboardPage — rien à chiffrer : l'état vide de la carte suffit (23/09/2026)", () => {
  afterEach(() => {
    etatCarte.vide = false
  })

  it("retire le bandeau « aucune position » et le renvoi vers l'analyse, qui feraient doublon", async () => {
    etatCarte.vide = true
    vi.mocked(api.listHoldings).mockResolvedValue([])
    renderPage()

    await waitFor(() => expect(api.listHoldings).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText(/voir l'analyse détaillée/)).not.toBeInTheDocument())
    expect(screen.queryByText(/Aucune position dans le portefeuille/)).not.toBeInTheDocument()
  })

  it('les garde quand il y a du patrimoine', async () => {
    renderPage()

    expect(await screen.findByText(/voir l'analyse détaillée/)).toBeInTheDocument()
  })
})

describe('DashboardPage — rappel si les cours ne sont plus actualisés (backlog § AF.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getPortfolioHistory).mockResolvedValue({ points: [] })
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue({ points: [] })
    // Une seule ligne cotée par défaut : sans elle, le rappel resterait masqué
    // (`auMoinsUnePositionCotee`) quel que soit `derniere_actualisation`.
    vi.mocked(api.listHoldings).mockResolvedValue([{ id: 1, market_data: { ticker: 'AAA', derniere_maj: '2026-01-01T00:00:00' } } as never])
    vi.mocked(api.refreshMarketData).mockResolvedValue({ en_cours: false } as never)
    vi.mocked(api.getRefreshStatus).mockResolvedValue({
      en_cours: false,
      positions_traitees: 1,
      positions_total: 1,
      demarre_le: null,
      termine_le: null,
      statut: 'ok',
      message: null,
    })
  })

  function actualisationDepuis(jours: number) {
    // Naïf, SANS "Z" — même format que l'API réelle (`datetime` naïf côté
    // backend, cf. `parseDateApi`) : `.toISOString()` seul produirait un format
    // avec "Z" qui aurait masqué le bug corrigé ici (le composant lisait ce
    // format avec `new Date(d)` plutôt que `parseDateApi(d)`, faussant le calcul
    // dans tout fuseau horaire différent d'UTC).
    return new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString().replace('Z', '')
  }

  it("n'affiche rien quand le dernier rafraîchissement date de moins de 3 jours", async () => {
    vi.mocked(api.getDerniereActualisationMarketData).mockResolvedValue({ derniere_actualisation: actualisationDepuis(1) })
    renderPage()

    await waitFor(() => expect(api.getDerniereActualisationMarketData).toHaveBeenCalled())
    expect(screen.queryByText(/actualisés/)).not.toBeInTheDocument()
  })

  it("n'affiche rien tant qu'aucun rafraîchissement n'a jamais été tenté (derniere_actualisation nulle)", async () => {
    vi.mocked(api.getDerniereActualisationMarketData).mockResolvedValue({ derniere_actualisation: null })
    renderPage()

    await waitFor(() => expect(api.getDerniereActualisationMarketData).toHaveBeenCalled())
    expect(screen.queryByText(/actualisés/)).not.toBeInTheDocument()
  })

  it("n'affiche rien pour un foyer sans aucune position cotée, même si le job n'a jamais tourné", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([{ id: 1, market_data: null } as never])
    vi.mocked(api.getDerniereActualisationMarketData).mockResolvedValue({ derniere_actualisation: actualisationDepuis(30) })
    renderPage()

    await waitFor(() => expect(api.listHoldings).toHaveBeenCalled())
    expect(screen.queryByText(/actualisés/)).not.toBeInTheDocument()
  })

  it('affiche le rappel avec le nombre de jours depuis le dernier rafraîchissement tenté', async () => {
    vi.mocked(api.getDerniereActualisationMarketData).mockResolvedValue({ derniere_actualisation: actualisationDepuis(5) })
    renderPage()

    expect(await screen.findByText(/n'ont pas été actualisés depuis 5 jours/)).toBeInTheDocument()
  })

  it("reste correct même avec une ligne Bricks.co structurellement jamais rafraîchie — rapport utilisateur du 21/09/2026", async () => {
    // La ligne Bricks.co (`market_data: null`, jamais interrogée par
    // construction) coexiste avec une vraie position cotée récemment
    // rafraîchie : l'ancien calcul (position par position) restait figé sur la
    // ligne Bricks.co pour toujours ; le nouveau, basé sur
    // `derniere_actualisation` (quand le JOB a tourné, pas une ligne précise),
    // reflète correctement un rafraîchissement récent.
    vi.mocked(api.listHoldings).mockResolvedValue([
      { id: 1, ticker: 'BRICKS-DEADBEEF12', nom: 'Bien Bricks', market_data: null } as never,
      { id: 2, ticker: 'AAA', market_data: { ticker: 'AAA', derniere_maj: actualisationDepuis(0) } } as never,
    ])
    vi.mocked(api.getDerniereActualisationMarketData).mockResolvedValue({ derniere_actualisation: actualisationDepuis(0) })
    renderPage()

    await waitFor(() => expect(api.getDerniereActualisationMarketData).toHaveBeenCalled())
    expect(screen.queryByText(/actualisés/)).not.toBeInTheDocument()
  })

  it('le bouton "Actualiser les cours" déclenche le rafraîchissement et fait disparaître le rappel', async () => {
    vi.mocked(api.getDerniereActualisationMarketData)
      .mockResolvedValueOnce({ derniere_actualisation: actualisationDepuis(5) })
      .mockResolvedValueOnce({ derniere_actualisation: actualisationDepuis(0) })
    renderPage()
    await screen.findByText(/n'ont pas été actualisés depuis 5 jours/)

    fireEvent.click(screen.getByRole('button', { name: 'Actualiser les cours' }))

    await waitFor(() => expect(api.refreshMarketData).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText(/actualisés/)).not.toBeInTheDocument())
  })

  it("ne s'affiche jamais en même temps que l'invitation à importer (portefeuille vide)", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([])
    vi.mocked(api.getDerniereActualisationMarketData).mockResolvedValue({ derniere_actualisation: actualisationDepuis(30) })
    renderPage()

    await waitFor(() => expect(api.listHoldings).toHaveBeenCalled())
    expect(screen.queryByText(/actualisés/)).not.toBeInTheDocument()
  })
})
