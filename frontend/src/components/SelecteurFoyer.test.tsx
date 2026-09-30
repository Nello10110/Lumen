import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { rechargerApplication } from '../auth/changementFoyer'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import SelecteurFoyer from './SelecteurFoyer'

vi.mock('../api/client', () => ({ api: { changerFoyerCourant: vi.fn() } }))
vi.mock('../auth/changementFoyer', () => ({ rechargerApplication: vi.fn() }))

function rendre(user: Partial<AuthUser>) {
  const contexte: AuthContextValue = {
    user: { id: 1, username: 'paul', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0, ...user },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: async () => {},
    refetchUser: async () => {},
  }
  return render(
    <AuthContext.Provider value={contexte}>
      <SelecteurFoyer />
    </AuthContext.Provider>,
  )
}

const DEUX_FOYERS = [
  { id: 11, nom: 'Famille Dupont', role: 'proprietaire' as const },
  { id: 12, nom: 'Chez Sophie', role: 'invite' as const },
]

describe('SelecteurFoyer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('n’affiche rien avec un seul foyer', () => {
    const { container } = rendre({ foyers: [DEUX_FOYERS[0]], foyer_courant_id: 11 })

    expect(container).toBeEmptyDOMElement()
  })

  it('n’affiche rien quand la liste des foyers est absente', () => {
    const { container } = rendre({})

    expect(container).toBeEmptyDOMElement()
  })

  it('à partir de deux foyers, liste le nom et le rôle de chacun, le foyer courant sélectionné', () => {
    rendre({ foyers: DEUX_FOYERS, foyer_courant_id: 11 })

    const liste = screen.getByRole('combobox', { name: 'Foyer courant' })
    expect(liste).toHaveValue('11')
    expect(screen.getByRole('option', { name: 'Famille Dupont · Propriétaire' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Chez Sophie · Invité' })).toBeInTheDocument()
  })

  it('un foyer sans nom reçoit un libellé de repli', () => {
    rendre({ foyers: [{ id: 11, nom: null, role: 'proprietaire' }, DEUX_FOYERS[1]], foyer_courant_id: 12 })

    expect(screen.getByRole('option', { name: 'Foyer sans nom · Propriétaire' })).toBeInTheDocument()
  })

  it('changer de foyer appelle le serveur puis recharge toute l’application', async () => {
    vi.mocked(api.changerFoyerCourant).mockResolvedValue({} as AuthUser)
    rendre({ foyers: DEUX_FOYERS, foyer_courant_id: 11 })

    fireEvent.change(screen.getByRole('combobox', { name: 'Foyer courant' }), { target: { value: '12' } })

    await waitFor(() => expect(rechargerApplication).toHaveBeenCalledTimes(1))
    expect(api.changerFoyerCourant).toHaveBeenCalledWith(12)
  })

  it('une bascule refusée affiche l’erreur et ne recharge rien', async () => {
    vi.mocked(api.changerFoyerCourant).mockRejectedValue(new Error('Foyer introuvable.'))
    rendre({ foyers: DEUX_FOYERS, foyer_courant_id: 11 })

    fireEvent.change(screen.getByRole('combobox', { name: 'Foyer courant' }), { target: { value: '12' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Foyer introuvable.')
    expect(rechargerApplication).not.toHaveBeenCalled()
  })
})
