import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { rechargerApplication } from '../auth/changementFoyer'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import QuitterFoyerModale from './QuitterFoyerModale'

vi.mock('../api/client', () => ({ api: { quitterFoyer: vi.fn() } }))
vi.mock('../auth/changementFoyer', () => ({ rechargerApplication: vi.fn() }))

function rendre(user: Partial<AuthUser>, onClose = vi.fn()) {
  const contexte: AuthContextValue = {
    user: { id: 1, username: 'sophie', role: 'membre', onboarding_termine: true, holdings_sans_compte: 0, ...user },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: async () => {},
    refetchUser: async () => {},
  }
  render(
    <AuthContext.Provider value={contexte}>
      <QuitterFoyerModale onClose={onClose} />
    </AuthContext.Provider>,
  )
  return onClose
}

describe('QuitterFoyerModale', () => {
  beforeEach(() => vi.clearAllMocks())

  it('demande confirmation avant de quitter, sans avertissement quand d’autres foyers restent', () => {
    rendre({
      foyers: [
        { id: 11, nom: 'A', role: 'membre' },
        { id: 12, nom: 'B', role: 'proprietaire' },
      ],
    })

    expect(screen.getByRole('heading', { name: 'Quitter ce foyer ?' })).toBeInTheDocument()
    expect(screen.queryByText(/C'est votre dernier foyer/)).not.toBeInTheDocument()
    expect(api.quitterFoyer).not.toHaveBeenCalled()
  })

  it('prévient qu’il ne restera plus aucun foyer (et que le compte n’est pas supprimé) pour le dernier', () => {
    rendre({ foyers: [{ id: 11, nom: 'A', role: 'membre' }] })

    expect(screen.getByText(/C'est votre dernier foyer/)).toBeInTheDocument()
    expect(screen.getByText(/Votre compte n'est pas supprimé/)).toBeInTheDocument()
  })

  it('confirmer quitte le foyer puis recharge l’application', async () => {
    vi.mocked(api.quitterFoyer).mockResolvedValue({} as AuthUser)
    rendre({ foyers: [{ id: 11, nom: 'A', role: 'membre' }] })

    fireEvent.click(screen.getByRole('button', { name: 'Quitter le foyer' }))

    await waitFor(() => expect(rechargerApplication).toHaveBeenCalledTimes(1))
    expect(api.quitterFoyer).toHaveBeenCalledTimes(1)
  })

  it('annuler ferme sans rien appeler', () => {
    const onClose = rendre({ foyers: [{ id: 11, nom: 'A', role: 'membre' }] })

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onClose).toHaveBeenCalled()
    expect(api.quitterFoyer).not.toHaveBeenCalled()
  })

  it('un refus du serveur (propriétaire) s’affiche et ne recharge rien', async () => {
    vi.mocked(api.quitterFoyer).mockRejectedValue(new Error('Le propriétaire ne peut pas quitter son foyer.'))
    rendre({ foyers: [{ id: 11, nom: 'A', role: 'membre' }] })

    fireEvent.click(screen.getByRole('button', { name: 'Quitter le foyer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Le propriétaire ne peut pas quitter son foyer.')
    expect(rechargerApplication).not.toHaveBeenCalled()
  })
})
