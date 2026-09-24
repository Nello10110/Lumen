import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur, Holding, LignesPatrimoineFiltreesResponse, PatrimoineHistoryPoint, PatrimoineHistoryResponse } from '../api/types'
import EvolutionFinanciereCard from './EvolutionFinanciereCard'

vi.mock('../api/client', () => ({
  api: {
    listHoldings: vi.fn(),
    listDetenteurs: vi.fn(),
    getPatrimoineHistory: vi.fn(),
    getLignesPatrimoine: vi.fn(),
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
    secteur: null,
    versement_mensuel: null,
    date_acquisition: null,
    ...overrides,
  }
}

function point(overrides: Partial<PatrimoineHistoryPoint> = {}): PatrimoineHistoryPoint {
  return {
    date: '2024-01-01',
    valeur_financiere: 0,
    valeur_manuelle: 0,
    actifs_totaux: 0,
    passifs_totaux: 0,
    patrimoine_net: 0,
    patrimoine_financier: 0,
    valeur_investie: 0,
    valeur_investie_nette: 0,
    valeur_realisee_cumulee: 0,
    ...overrides,
  }
}

function reponse(points: PatrimoineHistoryPoint[] = []): PatrimoineHistoryResponse {
  return { points }
}

function reponseLignes(lignes: LignesPatrimoineFiltreesResponse['lignes'] = []): LignesPatrimoineFiltreesResponse {
  return { lignes }
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
  vi.mocked(api.getPatrimoineHistory).mockResolvedValue(reponse())
  vi.mocked(api.getLignesPatrimoine).mockResolvedValue(reponseLignes())
  vi.mocked(api.listDetenteurs).mockResolvedValue([])
})

describe('EvolutionFinanciereCard', () => {
  it('affiche un état vide quand aucune position (financière ou manuelle) n\'existe', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([])

    render_()

    expect(await screen.findByText('Aucune position suivie pour l\'instant.')).toBeInTheDocument()
    expect(api.getPatrimoineHistory).not.toHaveBeenCalled()
  })

  it("une position valorisée manuellement seule (PER, sans aucune position financière) n'affiche plus l'état vide", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([
      holding({ ticker: 'PER1', type_actif: 'PENSION', origine: 'manuel' }),
    ])

    render_()

    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalled())
    expect(screen.queryByText('Aucune position suivie pour l\'instant.')).not.toBeInTheDocument()
  })

  it('propose aussi bien les classes financières que les classes valorisées manuellement (PER, immobilier...)', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([
      holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' }),
      holding({ id: 2, ticker: 'BBB', type_actif: 'CRYPTO', origine: 'reconstruit' }),
      holding({ id: 3, ticker: 'MAISON', type_actif: 'REAL_ESTATE', origine: 'manuel' }),
      holding({ id: 4, ticker: 'PER1', type_actif: 'PENSION', origine: 'manuel' }),
    ])

    render_()
    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalled())

    const select = screen.getByLabelText("Classe d'actif")
    expect(within(select).getByText('Action')).toBeInTheDocument()
    expect(within(select).getByText('Crypto')).toBeInTheDocument()
    expect(within(select).getByText('Immobilier')).toBeInTheDocument()
    expect(within(select).getByText('PER / Épargne retraite')).toBeInTheDocument()
  })

  it('choisir une classe d\'actif relance getPatrimoineHistory avec le bon filtre', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])

    render_()
    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(1))
    expect(api.getPatrimoineHistory).toHaveBeenLastCalledWith(
      null,
      { typeActif: undefined, compteId: undefined, etablissementId: undefined },
      expect.anything(),
    )

    fireEvent.change(screen.getByLabelText("Classe d'actif"), { target: { value: 'STOCK' } })

    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(2))
    expect(api.getPatrimoineHistory).toHaveBeenLastCalledWith(
      null,
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
    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('Établissement ou compte'), { target: { value: 'c:7' } })

    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(2))
    expect(api.getPatrimoineHistory).toHaveBeenLastCalledWith(
      null,
      { typeActif: undefined, compteId: 7, etablissementId: undefined },
      expect.anything(),
    )
  })

  it('affiche le % et le delta calculés sur la série reçue, en lentille Net par défaut', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue(
      reponse([point({ date: '2024-01-01', patrimoine_net: 1000 }), point({ date: '2024-06-01', patrimoine_net: 1100 })]),
    )

    render_()

    expect(await screen.findByText('↑ 10,0 %')).toBeInTheDocument()
  })

  it('le bouton Brut/Net recalcule sans nouvel appel réseau — la réponse porte déjà les deux champs', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue(
      reponse([
        point({ date: '2024-01-01', actifs_totaux: 2000, patrimoine_net: 1000 }),
        point({ date: '2024-06-01', actifs_totaux: 2000, patrimoine_net: 1100 }),
      ]),
    )

    render_()
    expect(await screen.findByText('↑ 10,0 %')).toBeInTheDocument() // net : 1000 -> 1100
    const appelsAvant = vi.mocked(api.getPatrimoineHistory).mock.calls.length

    fireEvent.click(screen.getByRole('button', { name: 'Brut' }))

    // Brut : 2000 -> 2000, donc 0 % — la variation change bien de valeur...
    expect(await screen.findByText('↑ 0,0 %')).toBeInTheDocument()
    // ... sans qu'un seul appel réseau supplémentaire n'ait été nécessaire.
    expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(appelsAvant)
  })

  it('choisir un détenteur relance getPatrimoineHistory avec detenteurId', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.listDetenteurs).mockResolvedValue([
      { id: 5, nom: 'Alice', created_at: '', updated_at: '' } as Detenteur,
    ])

    render_()
    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(1))

    fireEvent.change(await screen.findByLabelText('Détenteur'), { target: { value: '5' } })

    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(2))
    expect(api.getPatrimoineHistory).toHaveBeenLastCalledWith(
      5,
      { typeActif: undefined, compteId: undefined, etablissementId: undefined },
      expect.anything(),
    )
    expect(api.getLignesPatrimoine).toHaveBeenLastCalledWith(
      { typeActif: undefined, compteId: undefined, etablissementId: undefined, detenteurId: 5 },
      expect.anything(),
    )
  })

  it('affiche le détail des lignes sous le graphique', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue(reponse([point({ patrimoine_net: 1000 })]))
    vi.mocked(api.getLignesPatrimoine).mockResolvedValue(
      reponseLignes([
        {
          holding_id: 1,
          ticker: 'AAA',
          nom: null,
          type_actif_label: 'Actions',
          compte_nom: null,
          etablissement_nom: null,
          quantite: 10,
          valeur: 1000,
          valeur_nette: 1000,
          quotite_pct: null,
        },
      ]),
    )

    render_()

    expect(await screen.findByText('Détail des lignes')).toBeInTheDocument()
    expect(await screen.findByText('AAA')).toBeInTheDocument()
  })

  it('affiche un état vide dédié quand la combinaison de filtres ne renvoie aucun point', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue(reponse([]))

    render_()

    expect(await screen.findByText('Aucun historique pour cette combinaison de filtres.')).toBeInTheDocument()
  })

  it('le mode « Personnalisé » affiche deux champs de date, et une fourchette invalide bloque le graphique', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' })])
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue(reponse([point({ patrimoine_net: 1000 })]))

    render_()
    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Personnalisé' }))
    expect(screen.getByLabelText('Date de début')).toBeInTheDocument()
    expect(screen.getByLabelText('Date de fin')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2024-06-01' } })
    fireEvent.change(screen.getByLabelText('Date de fin'), { target: { value: '2024-01-01' } })

    expect(await screen.findByText('La date de fin doit être postérieure ou égale à la date de début.')).toBeInTheDocument()
    // Un changement de dates reste un filtrage client : aucun nouvel appel réseau.
    expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(1)
  })

  it('ne garde que le résultat du DERNIER filtre sélectionné (course entre deux requêtes)', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([
      holding({ ticker: 'AAA', type_actif: 'STOCK', origine: 'reconstruit' }),
      holding({ id: 2, ticker: 'BBB', type_actif: 'CRYPTO', origine: 'reconstruit' }),
    ])

    let resoudreRequeteStock: (v: PatrimoineHistoryResponse) => void = () => {}
    const requeteStock = new Promise<PatrimoineHistoryResponse>((resolve) => {
      resoudreRequeteStock = resolve
    })
    vi.mocked(api.getPatrimoineHistory)
      .mockResolvedValueOnce(reponse([])) // chargement initial, sans filtre
      .mockReturnValueOnce(requeteStock) // sélection STOCK : reste en attente
      .mockResolvedValueOnce(
        // sélection CRYPTO, juste après : résout tout de suite, +10 %.
        reponse([point({ date: '2024-01-01', patrimoine_net: 1000 }), point({ date: '2024-06-01', patrimoine_net: 1100 })]),
      )

    render_()
    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText("Classe d'actif"), { target: { value: 'STOCK' } })
    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(2))
    fireEvent.change(screen.getByLabelText("Classe d'actif"), { target: { value: 'CRYPTO' } })
    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalledTimes(3))

    expect(await screen.findByText('↑ 10,0 %')).toBeInTheDocument()

    // La requête STOCK (lancée avant CRYPTO, mais restée en attente) résout
    // seulement MAINTENANT, avec une variation très différente (+50 %) — son
    // résultat périmé ne doit jamais écraser celui, déjà affiché, de CRYPTO.
    resoudreRequeteStock(
      reponse([point({ date: '2024-01-01', patrimoine_net: 1000 }), point({ date: '2024-06-01', patrimoine_net: 1500 })]),
    )

    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByText('↑ 10,0 %')).toBeInTheDocument()
    expect(screen.queryByText('↑ 50,0 %')).not.toBeInTheDocument()
  })
})
