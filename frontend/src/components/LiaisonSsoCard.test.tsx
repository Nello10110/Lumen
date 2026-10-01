import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import LiaisonSsoCard from './LiaisonSsoCard'

vi.mock('../api/client', () => ({
  api: { getOidcStatus: vi.fn(), lierSso: vi.fn(), delierSso: vi.fn() },
}))

const UTILISATEUR: AuthUser = { id: 1, username: 'alice', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0 }

function rendre(user: AuthUser, refetchUser = vi.fn().mockResolvedValue(undefined)) {
  const valeur: AuthContextValue = {
    user,
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: async () => {},
    refetchUser,
  }
  render(
    <AuthContext.Provider value={valeur}>
      <LiaisonSsoCard />
    </AuthContext.Provider>,
  )
}

describe('LiaisonSsoCard', () => {
  const assign = vi.fn()

  beforeEach(() => {
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: true, display_name: 'Authentik', logo: null })
    vi.mocked(api.lierSso).mockReset()
    vi.mocked(api.delierSso).mockReset()
    assign.mockReset()
    vi.stubGlobal('location', { ...window.location, assign })
  })

  it("« Lier mon compte SSO » demande l'adresse d'autorisation puis y envoie le navigateur", async () => {
    vi.mocked(api.lierSso).mockResolvedValue({ url: 'https://sso.exemple.fr/autoriser?state=abc' })
    rendre(UTILISATEUR)

    fireEvent.click(await screen.findByRole('button', { name: 'Lier mon compte SSO' }))

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('https://sso.exemple.fr/autoriser?state=abc'))
    expect(screen.getByText(/Ton compte n'est pas lié à Authentik/)).toBeInTheDocument()
  })

  it('un compte lié propose de se délier, puis recharge l’utilisateur', async () => {
    vi.mocked(api.delierSso).mockResolvedValue(UTILISATEUR)
    const refetchUser = vi.fn().mockResolvedValue(undefined)
    rendre({ ...UTILISATEUR, sso_lie: true }, refetchUser)

    expect(await screen.findByText(/Ton compte est lié à Authentik/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lier mon compte SSO' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Délier mon compte SSO' }))

    await vi.waitFor(() => expect(refetchUser).toHaveBeenCalledTimes(1))
    expect(api.delierSso).toHaveBeenCalledTimes(1)
  })

  it('montre le refus du serveur (un compte sans mot de passe ne se délie pas)', async () => {
    vi.mocked(api.delierSso).mockRejectedValue(new Error("Ce compte n'a pas de mot de passe : sans le SSO, il ne pourrait plus se connecter."))
    rendre({ ...UTILISATEUR, sso_lie: true })

    fireEvent.click(await screen.findByRole('button', { name: 'Délier mon compte SSO' }))

    expect(await screen.findByText(/n'a pas de mot de passe/)).toBeInTheDocument()
  })

  it("n'apparaît pas quand le SSO n'est pas configuré", async () => {
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: false, display_name: 'SSO', logo: null })
    rendre(UTILISATEUR)

    await vi.waitFor(() => expect(api.getOidcStatus).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Connexion SSO' })).not.toBeInTheDocument()
  })

  it("n'apparaît jamais pour un opérateur (mot de passe seulement)", async () => {
    rendre({ ...UTILISATEUR, role: null, est_operateur: true })

    await vi.waitFor(() => expect(api.getOidcStatus).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: 'Connexion SSO' })).not.toBeInTheDocument()
  })
})
