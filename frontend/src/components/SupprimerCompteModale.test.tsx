import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { ApercuSuppressionCompte } from '../api/types'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import SupprimerCompteModale from './SupprimerCompteModale'

vi.mock('../api/client', () => ({ api: { apercuSuppressionCompte: vi.fn(), supprimerMonCompte: vi.fn() } }))

function apercu(overrides: Partial<ApercuSuppressionCompte> = {}): ApercuSuppressionCompte {
  return {
    confirmation_attendue: 'sophie',
    foyers_supprimes: [],
    foyers_quittes: [],
    foyers_bloquants: [],
    peut_supprimer: true,
    ...overrides,
  }
}

function rendre(onClose = vi.fn()) {
  const contexte: AuthContextValue = {
    user: { id: 1, username: 'sophie', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0 },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: vi.fn(),
    completeOnboarding: async () => {},
    refetchUser: async () => {},
  }
  render(
    <AuthContext.Provider value={contexte}>
      <SupprimerCompteModale onClose={onClose} />
    </AuthContext.Provider>,
  )
  return { contexte, onClose }
}

describe('SupprimerCompteModale (§ BK.2c)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sans blocage : détaille les foyers supprimés et quittés, exige le nom d’utilisateur, puis supprime et déconnecte', async () => {
    vi.mocked(api.apercuSuppressionCompte).mockResolvedValue(
      apercu({
        foyers_supprimes: [{ id: 11, nom: 'Chez moi', role: 'proprietaire' }],
        foyers_quittes: [{ id: 12, nom: 'Chez Paul', role: 'membre' }, { id: 13, nom: null, role: 'invite' }],
      }),
    )
    vi.mocked(api.supprimerMonCompte).mockResolvedValue(undefined)
    const { contexte } = rendre()

    expect(await screen.findByText(/Ce foyer sera supprimé avec votre compte/)).toBeInTheDocument()
    expect(screen.getByText('Chez moi')).toBeInTheDocument()
    expect(screen.getByText(/Vous quitterez ces 2 foyers/)).toBeInTheDocument()
    expect(screen.getByText('Chez Paul')).toBeInTheDocument()
    expect(screen.getByText('Foyer sans nom')).toBeInTheDocument()
    expect(screen.queryByText(/ne pouvez pas supprimer/)).not.toBeInTheDocument()

    const champ = screen.getByLabelText("Pour confirmer, saisissez votre nom d'utilisateur : sophie")
    const supprimer = screen.getByRole('button', { name: 'Supprimer définitivement' })
    expect(supprimer).toBeDisabled()
    fireEvent.change(champ, { target: { value: 'autre' } })
    expect(supprimer).toBeDisabled()
    fireEvent.change(champ, { target: { value: 'sophie' } })
    fireEvent.click(supprimer)

    await waitFor(() => expect(api.supprimerMonCompte).toHaveBeenCalledWith('sophie'))
    expect(contexte.logout).toHaveBeenCalledTimes(1)
  })

  it('un compte sans foyer : rien à lister, la suppression reste possible', async () => {
    vi.mocked(api.apercuSuppressionCompte).mockResolvedValue(apercu())
    rendre()

    expect(await screen.findByLabelText(/Pour confirmer/)).toBeInTheDocument()
    expect(screen.queryByText(/sera supprimé avec votre compte/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Vous quitterez/)).not.toBeInTheDocument()
  })

  it('bloqué : explique quels foyers empêchent la suppression et ne propose aucune confirmation', async () => {
    vi.mocked(api.apercuSuppressionCompte).mockResolvedValue(
      apercu({
        peut_supprimer: false,
        foyers_bloquants: [{ id: 11, nom: 'Chez moi', autres_comptes: 2 }],
      }),
    )
    const { contexte, onClose } = rendre()

    expect(await screen.findByText(/Vous ne pouvez pas supprimer votre compte pour l'instant/)).toBeInTheDocument()
    expect(screen.getByText('Chez moi')).toBeInTheDocument()
    expect(screen.getByText(/2 autres comptes/)).toBeInTheDocument()
    expect(screen.getByText(/transférez-en la propriété/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Pour confirmer/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Supprimer définitivement' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onClose).toHaveBeenCalled()
    expect(api.supprimerMonCompte).not.toHaveBeenCalled()
    expect(contexte.logout).not.toHaveBeenCalled()
  })

  it('un refus du serveur (409) s’affiche et ne déconnecte pas', async () => {
    vi.mocked(api.apercuSuppressionCompte).mockResolvedValue(apercu())
    vi.mocked(api.supprimerMonCompte).mockRejectedValue(new Error('Transférez d’abord la propriété.'))
    const { contexte } = rendre()

    fireEvent.change(await screen.findByLabelText(/Pour confirmer/), { target: { value: 'sophie' } })
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Transférez d’abord la propriété.')
    expect(contexte.logout).not.toHaveBeenCalled()
  })

  it('un aperçu qui échoue s’affiche, sans confirmation possible', async () => {
    vi.mocked(api.apercuSuppressionCompte).mockRejectedValue(new Error('panne'))
    rendre()

    expect(await screen.findByRole('alert')).toHaveTextContent('panne')
    expect(screen.getByRole('button', { name: 'Supprimer définitivement' })).toBeDisabled()
  })
})
