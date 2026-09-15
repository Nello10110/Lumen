import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import Sidebar from './Sidebar'

// `useVariationPatrimoine` (backlog § AD.2, halo réactif du logo) consomme les
// deux — même patron de double que `DashboardPage.test.tsx`, qui partage les
// mêmes dépendances.
vi.mock('../api/client', () => ({
  api: { getPatrimoineHistory: vi.fn().mockResolvedValue({ points: [] }) },
}))
vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({
    lentille: 'net',
    setLentille: vi.fn(),
    montantsMasques: false,
    toggleMontantsMasques: vi.fn(),
    detenteurId: null,
    setDetenteurId: vi.fn(),
    periode: { type: 'relative', valeur: 'TOUT' },
    setPeriode: vi.fn(),
  }),
}))

const utilisateurFactice: AuthContextValue = {
  user: { id: 1, username: 'testeur', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0 },
  loading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  completeOnboarding: async () => {},
  refetchUser: async () => {},
}

function renderSidebar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={utilisateurFactice}>
        <Sidebar />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(api.getPatrimoineHistory).mockResolvedValue({ points: [] })
})

describe('Sidebar (backlog 2.K.2)', () => {
  it('affiche les écrans de consultation avec leur URL', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /Synthèse/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /^Patrimoine$/ })).toHaveAttribute('href', '/patrimoine')
    expect(screen.getByRole('link', { name: /Objectifs/ })).toHaveAttribute('href', '/objectifs')
    expect(screen.getByRole('link', { name: /Comptes/ })).toHaveAttribute('href', '/comptes')
    expect(screen.getByRole('link', { name: /Analyse/ })).toHaveAttribute('href', '/analyse')
    expect(screen.getByRole('link', { name: /Rapport/ })).toHaveAttribute('href', '/rapport')
  })

  it("n'affiche pas les écrans d'administration", () => {
    renderSidebar()
    expect(screen.queryByRole('link', { name: /^Import$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Réglages$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Aide$/ })).not.toBeInTheDocument()
  })

  // Refonte « liquid glass » (étape 3) : l'item actif porte le dégradé d'accent
  // (`bg-[image:var(--accent-grad)]`), les inactifs n'ont plus de fond du tout.
  it('marque comme actif le lien correspondant à la route courante', () => {
    renderSidebar('/patrimoine')
    expect(screen.getByRole('link', { name: /^Patrimoine$/ })).toHaveClass('bg-[image:var(--accent-grad)]')
    expect(screen.getByRole('link', { name: /Synthèse/ })).not.toHaveClass('bg-[image:var(--accent-grad)]')
  })

  // Le repliage a été retiré à l'étape 3 de la refonte (largeur fixe de 222 px) :
  // il coûtait un bouton permanent, un hook persisté et une variante `compact` sur
  // trois composants pour gagner 96 px.
  it("n'a plus de bouton de repliage", () => {
    renderSidebar()
    expect(screen.queryByRole('button', { name: /barre latérale/ })).not.toBeInTheDocument()
  })

  // Backlog § AD.5 (15/09/2026) : easter egg discret.
  describe('fait amusant (5 clics sur le logo)', () => {
    it('affiche le fait amusant après 5 clics, jamais avant', () => {
      renderSidebar()
      const logo = screen.getByRole('link', { name: 'Lumen' })

      for (let i = 0; i < 4; i++) fireEvent.click(logo)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()

      fireEvent.click(logo)
      expect(screen.getByRole('status')).toHaveTextContent(/flux lumineux d'une bougie/)
    })

    it('se ferme au clic sur « Fermer », et un nouveau cycle de 5 clics le rouvre', () => {
      renderSidebar()
      const logo = screen.getByRole('link', { name: 'Lumen' })
      for (let i = 0; i < 5; i++) fireEvent.click(logo)
      expect(screen.getByRole('status')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()

      for (let i = 0; i < 5; i++) fireEvent.click(logo)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })

  // Backlog § AD.2 (15/09/2026) : halo réactif du logo.
  it('le logo porte un halo vert quand le patrimoine progresse sur la période affichée', async () => {
    const pointBase = { valeur_financiere: 0, valeur_manuelle: 0, passifs_totaux: 0, valeur_investie: 0, valeur_investie_nette: 0, valeur_realisee_cumulee: 0 }
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue({
      points: [
        { ...pointBase, date: '2026-01-01', actifs_totaux: 1000, patrimoine_net: 1000, patrimoine_financier: 1000 },
        { ...pointBase, date: '2026-06-01', actifs_totaux: 1200, patrimoine_net: 1200, patrimoine_financier: 1200 },
      ],
    })
    const { container } = renderSidebar()

    await waitFor(() => {
      const svg = container.querySelector('svg[aria-hidden="true"]')
      expect(svg?.getAttribute('style')).toContain('drop-shadow')
    })
  })
})
