import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import MenuPlusSheet from './MenuPlusSheet'

vi.mock('../api/client', () => ({
  api: { getOidcStatus: vi.fn(), lierSso: vi.fn(), delierSso: vi.fn(), apercuSuppressionCompte: vi.fn() },
}))

function rendre(user: Partial<NonNullable<AuthContextValue['user']>>) {
  const valeur: AuthContextValue = {
    user: { id: 1, username: 'testeur', role: 'membre', onboarding_termine: true, holdings_sans_compte: 0, ...user },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: async () => {},
    refetchUser: async () => {},
  }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={valeur}>
        <MenuPlusSheet routesConsultationRestantes={[]} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

// Backlog § BK.2d : la feuille « Plus » (mobile) propose « Connexion SSO… » comme le menu du compte.
describe('MenuPlusSheet — « Connexion SSO… »', () => {
  const assign = vi.fn()

  beforeEach(() => {
    vi.mocked(api.getOidcStatus).mockReset().mockResolvedValue({ enabled: true, display_name: 'Authentik', logo: null })
    vi.mocked(api.lierSso).mockReset()
    assign.mockReset()
    vi.stubGlobal('location', { ...window.location, assign })
  })

  it('un membre lie son compte depuis la feuille', async () => {
    vi.mocked(api.lierSso).mockResolvedValue({ url: 'https://sso.exemple.fr/autoriser?state=xyz' })
    rendre({ role: 'membre' })
    await waitFor(() => expect(api.getOidcStatus).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Plus' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Connexion SSO…' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Lier mon compte SSO' }))

    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://sso.exemple.fr/autoriser?state=xyz'))
  })

  it("pas d'entrée sans SSO configuré, ni pour le propriétaire (carte de Réglages)", async () => {
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: false, display_name: 'SSO', logo: null })
    rendre({ role: 'invite' })
    await waitFor(() => expect(api.getOidcStatus).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'Plus' }))
    expect(screen.queryByRole('button', { name: 'Connexion SSO…' })).not.toBeInTheDocument()
  })

  it('le propriétaire : aucune entrée et aucun appel', () => {
    rendre({ role: 'proprietaire' })
    fireEvent.click(screen.getByRole('button', { name: 'Plus' }))

    expect(screen.queryByRole('button', { name: 'Connexion SSO…' })).not.toBeInTheDocument()
    expect(api.getOidcStatus).not.toHaveBeenCalled()
  })
})
