import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import BandeauLiaisonSso from '../components/BandeauLiaisonSso'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import { useRetourLiaisonSso } from './useRetourLiaisonSso'

vi.mock('../api/client', () => ({
  api: { confirmerLiaisonSso: vi.fn() },
}))

const UTILISATEUR: AuthUser = { id: 1, username: 'alice', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0 }

function Banc() {
  const { retour, fermer } = useRetourLiaisonSso()
  return <BandeauLiaisonSso retour={retour} onFermer={fermer} />
}

function rendre(user: AuthUser | null, refetchUser = vi.fn().mockResolvedValue(undefined), loading = false) {
  const valeur: AuthContextValue = {
    user,
    loading,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: async () => {},
    refetchUser,
  }
  const rendu = render(
    <AuthContext.Provider value={valeur}>
      <Banc />
    </AuthContext.Provider>,
  )
  return { ...rendu, refetchUser }
}

describe('useRetourLiaisonSso — retour du fournisseur SSO (backlog § BK.2d)', () => {
  beforeEach(() => {
    vi.mocked(api.confirmerLiaisonSso).mockReset()
    window.history.replaceState(null, '', '/')
  })

  it('confirme le code avec le compte connecté, retire le paramètre de l’URL et annonce le succès', async () => {
    vi.mocked(api.confirmerLiaisonSso).mockResolvedValue(UTILISATEUR)
    window.history.replaceState(null, '', '/reglages?onglet=securite&oidc_liaison=code-secret-123#haut')

    const { refetchUser } = rendre(UTILISATEUR)

    // Retiré dès la lecture, avant même la réponse du serveur ; le reste de l'adresse est intact.
    expect(window.location.search).toBe('?onglet=securite')
    expect(window.location.hash).toBe('#haut')
    expect(window.location.href).not.toContain('code-secret-123')
    await screen.findByText('Ton compte est maintenant lié à ton identité SSO.')
    expect(api.confirmerLiaisonSso).toHaveBeenCalledTimes(1)
    expect(api.confirmerLiaisonSso).toHaveBeenCalledWith('code-secret-123')
    expect(refetchUser).toHaveBeenCalledTimes(1)
  })

  it('ne confirme rien tant que l’utilisateur n’est pas connu, puis le fait une seule fois', async () => {
    vi.mocked(api.confirmerLiaisonSso).mockResolvedValue(UTILISATEUR)
    window.history.replaceState(null, '', '/?oidc_liaison=code-attente')
    const refetchUser = vi.fn().mockResolvedValue(undefined)
    const valeur = (user: AuthUser | null, loading: boolean): AuthContextValue => ({
      user,
      loading,
      login: async () => {},
      register: async () => {},
      logout: () => {},
      completeOnboarding: async () => {},
      refetchUser,
    })

    const { rerender } = render(
      <AuthContext.Provider value={valeur(null, true)}>
        <Banc />
      </AuthContext.Provider>,
    )
    expect(api.confirmerLiaisonSso).not.toHaveBeenCalled()
    expect(window.location.search).toBe('')

    rerender(
      <AuthContext.Provider value={valeur(UTILISATEUR, false)}>
        <Banc />
      </AuthContext.Provider>,
    )
    await screen.findByText('Ton compte est maintenant lié à ton identité SSO.')
    expect(api.confirmerLiaisonSso).toHaveBeenCalledTimes(1)
  })

  it('sans session ouverte, abandonne le code : aucune confirmation par un compte qui se connecterait ensuite', async () => {
    window.history.replaceState(null, '', '/?oidc_liaison=code-orphelin')

    const { rerender, refetchUser } = rendre(null)

    expect(await screen.findByText(/Aucune session n'était ouverte/)).toBeInTheDocument()
    expect(window.location.search).toBe('')
    // Un compte qui se connecte ensuite ne reprend pas le code.
    rerender(
      <AuthContext.Provider
        value={{
          user: UTILISATEUR,
          loading: false,
          login: async () => {},
          register: async () => {},
          logout: () => {},
          completeOnboarding: async () => {},
          refetchUser,
        }}
      >
        <Banc />
      </AuthContext.Provider>,
    )
    await waitFor(() => expect(screen.getByText(/Aucune session n'était ouverte/)).toBeInTheDocument())
    expect(api.confirmerLiaisonSso).not.toHaveBeenCalled()
  })

  it('montre le refus du serveur, et le bandeau se ferme', async () => {
    vi.mocked(api.confirmerLiaisonSso).mockRejectedValue(new Error('Liaison SSO introuvable, expirée ou déjà utilisée.'))
    window.history.replaceState(null, '', '/?oidc_liaison=code-perime')

    rendre(UTILISATEUR)

    expect(await screen.findByText(/Liaison SSO impossible : Liaison SSO introuvable, expirée ou déjà utilisée\./)).toBeInTheDocument()
    screen.getByRole('button', { name: 'Fermer' }).click()
    await waitFor(() => expect(screen.queryByText(/Liaison SSO impossible/)).not.toBeInTheDocument())
  })

  it('affiche le message d’un retour en erreur (oidc_liaison_erreur) et le retire de l’URL', async () => {
    window.history.replaceState(null, '', '/?oidc_liaison_erreur=Cette%20identit%C3%A9%20est%20d%C3%A9j%C3%A0%20li%C3%A9e%20%C3%A0%20un%20autre%20compte.')

    rendre(UTILISATEUR)

    expect(await screen.findByText(/Cette identité est déjà liée à un autre compte\./)).toBeInTheDocument()
    expect(window.location.search).toBe('')
    expect(api.confirmerLiaisonSso).not.toHaveBeenCalled()
  })

  it('ne fait rien quand l’adresse ne porte aucun paramètre de liaison', () => {
    window.history.replaceState(null, '', '/reglages?onglet=securite')

    rendre(UTILISATEUR)

    expect(window.location.search).toBe('?onglet=securite')
    expect(api.confirmerLiaisonSso).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
