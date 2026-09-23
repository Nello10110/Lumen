import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { clearToken, getToken } from '../auth/tokenStorage'
import { useAuth } from '../hooks/useAuth'
import { activerLangue } from '../i18n'
import { AuthProvider } from './AuthContext'

vi.mock('../api/client', () => ({
  api: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}))

function utilisateur(overrides: Partial<AuthUser> = {}): AuthUser {
  return { id: 1, username: 'alice', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0, ...overrides }
}

function Sonde() {
  const { user, loading } = useAuth()
  if (loading) return <p>Chargement...</p>
  return <p>{user ? `Connecté : ${user.username}` : 'Déconnecté'}</p>
}

describe('AuthProvider — retour de connexion Authentik (backlog SSO Authentik)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearToken()
    window.history.replaceState(null, '', '/')
  })

  it("capture un jeton en fragment d'URL au montage, nettoie l'URL, et se connecte", async () => {
    vi.mocked(api.getMe).mockResolvedValue(utilisateur())
    window.history.replaceState(null, '', '/#token=jeton-authentik-123')

    render(
      <AuthProvider>
        <Sonde />
      </AuthProvider>,
    )

    await screen.findByText('Connecté : alice')
    expect(getToken()).toBe('jeton-authentik-123')
    expect(window.location.hash).toBe('')
    expect(api.getMe).toHaveBeenCalledTimes(1)
  })

  it("sans fragment ni jeton stocké, reste déconnecté sans appeler getMe", async () => {
    render(
      <AuthProvider>
        <Sonde />
      </AuthProvider>,
    )

    await screen.findByText('Déconnecté')
    expect(api.getMe).not.toHaveBeenCalled()
  })

  it('un jeton déjà en localStorage (sans fragment) est validé normalement', async () => {
    vi.mocked(api.getMe).mockResolvedValue(utilisateur({ username: 'bob' }))
    localStorage.setItem('patrimoine_auth_token', 'jeton-existant')

    render(
      <AuthProvider>
        <Sonde />
      </AuthProvider>,
    )

    await screen.findByText('Connecté : bob')
  })
})

// Backlog § BL : le premier compte crée son foyer dans la langue de l'écran de
// création — sinon un anglophone verrait l'application repasser en français
// juste après s'être inscrit.
describe('AuthProvider — langue du foyer à la création du premier compte', () => {
  afterEach(async () => {
    await activerLangue('fr')
  })

  it("transmet la langue active à l'inscription", async () => {
    clearToken()
    vi.mocked(api.register).mockResolvedValue({ token: 'jeton', user: utilisateur({ langue: 'es' }) })
    await activerLangue('es')
    let inscrire: (u: string, p: string) => Promise<void> = async () => {}
    function Inscription() {
      inscrire = useAuth().register
      return null
    }
    render(
      <AuthProvider>
        <Inscription />
      </AuthProvider>,
    )

    await inscrire('alice', 'mot-de-passe-solide')

    expect(api.register).toHaveBeenCalledWith('alice', 'mot-de-passe-solide', 'es')
  })
})
