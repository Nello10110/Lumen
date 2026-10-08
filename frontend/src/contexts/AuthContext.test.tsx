import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ErreurServeurInjoignable } from '../api/client'
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
  // Classe réelle (pas un double) : le fournisseur la reconnaît par `instanceof`.
  ErreurServeurInjoignable: class ErreurServeurInjoignable extends Error {},
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

// Correctif #88 : un déploiement redémarre le backend, et le premier appel de l'application
// (`GET /auth/me`) tombe dessus. Le jeton n'y est pour rien : le révoquer déconnectait
// l'utilisateur à chaque mise à jour.
describe('AuthProvider — serveur qui redémarre pendant la vérification de la session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearToken()
    window.history.replaceState(null, '', '/')
    localStorage.setItem('patrimoine_auth_token', 'jeton-existant')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('garde le jeton et réessaie : la session est rétablie dès que le serveur répond', async () => {
    vi.useFakeTimers()
    vi.mocked(api.getMe)
      .mockRejectedValueOnce(new ErreurServeurInjoignable())
      .mockRejectedValueOnce(new ErreurServeurInjoignable())
      .mockResolvedValueOnce(utilisateur({ username: 'carole' }))

    render(
      <AuthProvider>
        <Sonde />
      </AuthProvider>,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByText('Chargement...')).toBeInTheDocument()
    expect(getToken()).toBe('jeton-existant')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000 + 2000)
    })

    expect(screen.getByText('Connecté : carole')).toBeInTheDocument()
    expect(api.getMe).toHaveBeenCalledTimes(3)
    expect(getToken()).toBe('jeton-existant')
  })

  it("serveur muet après tous les essais : rend la main à l'écran de connexion SANS effacer le jeton", async () => {
    vi.useFakeTimers()
    vi.mocked(api.getMe).mockRejectedValue(new ErreurServeurInjoignable())

    render(
      <AuthProvider>
        <Sonde />
      </AuthProvider>,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(130_000)
    })

    expect(screen.getByText('Déconnecté')).toBeInTheDocument()
    expect(getToken()).toBe('jeton-existant')
  })

  it('une autre erreur (jeton refusé...) révoque toujours le jeton, sans réessai', async () => {
    vi.mocked(api.getMe).mockRejectedValue(new Error('Jeton invalide'))

    render(
      <AuthProvider>
        <Sonde />
      </AuthProvider>,
    )

    await screen.findByText('Déconnecté')
    expect(getToken()).toBeNull()
    expect(api.getMe).toHaveBeenCalledTimes(1)
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
