import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import { PreferencesAffichageContext } from '../contexts/preferencesAffichageContextObject'
import { PERIODE_DEFAUT } from '../utils/periode'
import PatrimoineVide from './PatrimoineVide'

vi.mock('../api/client', () => ({
  api: { listDetenteurs: vi.fn() },
}))

type Role = 'proprietaire' | 'membre' | 'invite'

function auth(role: Role): AuthContextValue {
  return {
    user: { id: 1, username: 'marie', role, onboarding_termine: true, holdings_sans_compte: 0 },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: async () => {},
    refetchUser: async () => {},
  }
}

function afficher({
  detenteurId = null,
  role = 'proprietaire',
  setDetenteurId = vi.fn(),
}: { detenteurId?: number | null; role?: Role; setDetenteurId?: (id: number | null) => void } = {}) {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={auth(role)}>
        <PreferencesAffichageContext.Provider
          value={{
            lentille: 'net',
            setLentille: vi.fn(),
            montantsMasques: false,
            toggleMontantsMasques: vi.fn(),
            detenteurId,
            setDetenteurId,
            periode: PERIODE_DEFAUT,
            setPeriode: vi.fn(),
            langageSimple: false,
            toggleLangageSimple: vi.fn(),
          }}
        >
          <PatrimoineVide />
        </PreferencesAffichageContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return { setDetenteurId }
}

beforeEach(() => {
  vi.mocked(api.listDetenteurs).mockResolvedValue([
    { id: 7, nom: 'Alice', created_at: '2026-01-01', updated_at: '2026-01-01' },
  ])
})

describe('PatrimoineVide — accueil sans rien à chiffrer (23/09/2026)', () => {
  it('foyer tout neuf : dit par où commencer, import ou saisie à la main', () => {
    afficher()

    expect(screen.getByRole('heading', { name: 'Ton patrimoine commence ici' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Importer un relevé' })).toHaveAttribute('href', '/import')
    // `?ajout=1` ouvre directement le formulaire d'ajout de l'écran Actifs.
    expect(screen.getByRole('link', { name: 'Saisir une ligne à la main' })).toHaveAttribute('href', '/patrimoine?ajout=1')
  })

  it('personne sans actif attribué : la nomme, propose de répartir ou de revenir au foyer', async () => {
    const { setDetenteurId } = afficher({ detenteurId: 7 })

    expect(await screen.findByRole('heading', { name: "Rien n'est encore attribué à Alice" })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Répartir un compte' })).toHaveAttribute('href', '/comptes')
    fireEvent.click(screen.getByRole('button', { name: 'Voir tout le foyer' }))
    expect(setDetenteurId).toHaveBeenCalledWith(null)
  })

  it("nom introuvable : une formulation neutre, jamais d'erreur", async () => {
    vi.mocked(api.listDetenteurs).mockRejectedValue(new Error('panne simulée'))
    afficher({ detenteurId: 7 })

    expect(await screen.findByRole('heading', { name: "Rien n'est encore attribué à cette personne" })).toBeInTheDocument()
  })

  it("un invité ne se voit proposer aucune action qu'on lui refuserait", () => {
    afficher({ role: 'invite' })

    expect(screen.getByText(/Aucun actif ne t'est encore visible/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
