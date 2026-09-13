import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Holding, PortfolioHistoryResponse } from '../api/types'
import EvolutionFinanciereCard from './EvolutionFinanciereCard'

vi.mock('../api/client', () => ({
  api: {
    listHoldings: vi.fn(),
    getPortfolioHistory: vi.fn(),
  },
}))

vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ montantsMasques: false }),
}))

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 1,
    ticker: 'AAA',
    nom: null,
    quantite: 10,
    prix_revient_moyen: 100,
    cout_acquisition_total: 100,
    compte: null,
    devise: 'EUR',
    type_actif: 'STOCK',
    origine: 'reconstruit',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    market_data: null,
    rendement_depuis_achat_pct: null,
    rendement_annualise_pct: null,
    valeur: 1000,
    valeur_estimee: null,
    date_valeur_estimee: null,
    taux_pct: null,
    zone_geo: null,
    versement_mensuel: null,
    date_acquisition: null,
    ...overrides,
  }
}

function reponse(points: PortfolioHistoryResponse['points'] = []): PortfolioHistoryResponse {
  return { points }
}

function render_() {
  return render(
    <MemoryRouter>
      <EvolutionFinanciereCard />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.getPortfolioHistory).mockResolvedValue(reponse())
})

describe('EvolutionFinanciereCard', () => {
  it("affiche un état vide quand aucune position financière issue d'un import n'existe", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([
      holding({ ticker: 'MAISON', type_actif: 'REAL_ESTATE', origine: 'manuel' }),
    ])

    render_()

    expect(await screen.findByText('Aucune position boursière suivie pour l\'instant.')).toBeInTheDocument()
    expect(api.getPortfolioHistory).not.toHaveBeenCalled()
  })

  it('ne propose que les classes financières reconstruites au sélecteur (pas l\'immobilier manuel)', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([
      holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' }),
      holding({ id: 2, ticker: 'BBB', type_actif: 'CRYPTO', origine: 'reconstruit' }),
      holding({ id: 3, ticker: 'MAISON', type_actif: 'REAL_ESTATE', origine: 'manuel' }),
    ])

    render_()
    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalled())

    const select = screen.getByLabelText("Classe d'actif")
    expect(within(select).getByText('Actions')).toBeInTheDocument()
    expect(within(select).getByText('Crypto')).toBeInTheDocument()
    expect(within(select).queryByText('Immobilier')).not.toBeInTheDocument()
  })

  it('choisir une classe d\'actif relance getPortfolioHistory avec le bon filtre', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])

    render_()
    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(1))
    expect(api.getPortfolioHistory).toHaveBeenLastCalledWith(
      { typeActif: undefined, compteId: undefined, etablissementId: undefined },
      expect.anything(),
    )

    fireEvent.change(screen.getByLabelText("Classe d'actif"), { target: { value: 'STOCK' } })

    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(2))
    expect(api.getPortfolioHistory).toHaveBeenLastCalledWith(
      { typeActif: 'STOCK', compteId: undefined, etablissementId: undefined },
      expect.anything(),
    )
  })

  it('choisir un compte au sélecteur combiné établissement/compte relance avec compteId', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([
      holding({
        ticker: 'AAA',
        type_actif: 'STOCK',
        origine: 'reconstruit',
        compte: { id: 7, nom: 'PEA Trade Republic', etablissement: null, created_at: '', updated_at: '' },
      }),
    ])

    render_()
    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('Établissement ou compte'), { target: { value: 'c:7' } })

    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(2))
    expect(api.getPortfolioHistory).toHaveBeenLastCalledWith(
      { typeActif: undefined, compteId: 7, etablissementId: undefined },
      expect.anything(),
    )
  })

  it('affiche le % et le delta calculés sur la série reçue', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.getPortfolioHistory).mockResolvedValue(
      reponse([
        { date: '2024-01-01', valeur_portefeuille: 1000, valeur_investie: 1000, valeur_realisee_cumulee: 0 },
        { date: '2024-06-01', valeur_portefeuille: 1100, valeur_investie: 1000, valeur_realisee_cumulee: 0 },
      ]),
    )

    render_()

    expect(await screen.findByText('↑ 10.0 %')).toBeInTheDocument()
  })

  it('affiche un état vide dédié quand la combinaison de filtres ne renvoie aucun point', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.getPortfolioHistory).mockResolvedValue(reponse([]))

    render_()

    expect(await screen.findByText('Aucun historique pour cette combinaison de filtres.')).toBeInTheDocument()
  })

  it('le mode « Personnalisé » affiche deux champs de date, et une fourchette invalide bloque le graphique', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.getPortfolioHistory).mockResolvedValue(
      reponse([{ date: '2024-01-01', valeur_portefeuille: 1000, valeur_investie: 1000, valeur_realisee_cumulee: 0 }]),
    )

    render_()
    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Personnalisé' }))
    expect(screen.getByLabelText('Date de début')).toBeInTheDocument()
    expect(screen.getByLabelText('Date de fin')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2024-06-01' } })
    fireEvent.change(screen.getByLabelText('Date de fin'), { target: { value: '2024-01-01' } })

    expect(await screen.findByText('La date de fin doit être postérieure ou égale à la date de début.')).toBeInTheDocument()
    // Un changement de dates reste un filtrage client : aucun nouvel appel réseau.
    expect(api.getPortfolioHistory).toHaveBeenCalledTimes(1)
  })

  it('ne garde que le résultat du DERNIER filtre sélectionné (course entre deux requêtes)', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([
      holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' }),
      holding({ id: 2, ticker: 'BBB', type_actif: 'CRYPTO', origine: 'reconstruit' }),
    ])

    let resoudreRequeteStock: (v: PortfolioHistoryResponse) => void = () => {}
    const requeteStock = new Promise<PortfolioHistoryResponse>((resolve) => {
      resoudreRequeteStock = resolve
    })
    vi.mocked(api.getPortfolioHistory)
      .mockResolvedValueOnce(reponse([])) // chargement initial, sans filtre
      .mockReturnValueOnce(requeteStock) // sélection STOCK : reste en attente
      .mockResolvedValueOnce(
        // sélection CRYPTO, juste après : résout tout de suite, +10 %.
        reponse([
          { date: '2024-01-01', valeur_portefeuille: 1000, valeur_investie: 1000, valeur_realisee_cumulee: 0 },
          { date: '2024-06-01', valeur_portefeuille: 1100, valeur_investie: 1000, valeur_realisee_cumulee: 0 },
        ]),
      )

    render_()
    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText("Classe d'actif"), { target: { value: 'STOCK' } })
    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(2))
    fireEvent.change(screen.getByLabelText("Classe d'actif"), { target: { value: 'CRYPTO' } })
    await waitFor(() => expect(api.getPortfolioHistory).toHaveBeenCalledTimes(3))

    expect(await screen.findByText('↑ 10.0 %')).toBeInTheDocument()

    // La requête STOCK (lancée avant CRYPTO, mais restée en attente) résout
    // seulement MAINTENANT, avec une variation très différente (+50 %) — son
    // résultat périmé ne doit jamais écraser celui, déjà affiché, de CRYPTO.
    resoudreRequeteStock(
      reponse([
        { date: '2024-01-01', valeur_portefeuille: 1000, valeur_investie: 1000, valeur_realisee_cumulee: 0 },
        { date: '2024-06-01', valeur_portefeuille: 1500, valeur_investie: 1000, valeur_realisee_cumulee: 0 },
      ]),
    )

    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByText('↑ 10.0 %')).toBeInTheDocument()
    expect(screen.queryByText('↑ 50.0 %')).not.toBeInTheDocument()
  })
})
