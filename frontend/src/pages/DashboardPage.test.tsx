import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    // Backlog § AF.4 : le bouton "Rallumer les cours" de l'encart passe par le même
    // hook que celui de Portefeuille (`useRafraichissementCours`) — non testé en
    // détail ici (déjà couvert par `PortefeuillePage.test.tsx`), résolutions neutres.
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
vi.mock('../components/PatrimoineNetCard', () => ({ default: () => <div /> }))

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

describe('DashboardPage — rappel si les cours dorment (backlog § AF.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getPortfolioHistory).mockResolvedValue({ points: [] })
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue({ points: [] })
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

  function holdingAvecCotation(joursDepuisMaj: number) {
    const maj = new Date(Date.now() - joursDepuisMaj * 24 * 60 * 60 * 1000).toISOString()
    return { id: 1, market_data: { ticker: 'AAA', derniere_maj: maj } } as never
  }

  it("n'affiche rien quand la position la plus ancienne a été rafraîchie il y a moins de 3 jours", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holdingAvecCotation(1)])
    renderPage()

    await waitFor(() => expect(api.listHoldings).toHaveBeenCalled())
    expect(screen.queryByText(/dorment/)).not.toBeInTheDocument()
  })

  it("n'affiche rien pour des positions sans cotation (saisie manuelle)", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([{ id: 1, market_data: null } as never])
    renderPage()

    await waitFor(() => expect(api.listHoldings).toHaveBeenCalled())
    expect(screen.queryByText(/dorment/)).not.toBeInTheDocument()
  })

  it('affiche le rappel avec le nombre de jours de la position la plus ancienne', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holdingAvecCotation(1), holdingAvecCotation(5)])
    renderPage()

    expect(await screen.findByText(/Vos cours dorment depuis 5 jours/)).toBeInTheDocument()
  })

  it('le bouton "Rallumer les cours" déclenche le rafraîchissement et fait disparaître le rappel', async () => {
    vi.mocked(api.listHoldings)
      .mockResolvedValueOnce([holdingAvecCotation(5)])
      .mockResolvedValueOnce([holdingAvecCotation(0)])
    renderPage()
    await screen.findByText(/Vos cours dorment depuis 5 jours/)

    fireEvent.click(screen.getByRole('button', { name: 'Rallumer les cours' }))

    await waitFor(() => expect(api.refreshMarketData).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText(/dorment/)).not.toBeInTheDocument())
  })

  it("ne s'affiche jamais en même temps que l'invitation à importer (portefeuille vide)", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([])
    renderPage()

    await waitFor(() => expect(api.listHoldings).toHaveBeenCalled())
    expect(screen.queryByText(/dorment/)).not.toBeInTheDocument()
  })
})
