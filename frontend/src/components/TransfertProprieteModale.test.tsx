import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser, HouseholdMember } from '../api/types'
import { rechargerApplication } from '../auth/changementFoyer'
import TransfertProprieteModale from './TransfertProprieteModale'

vi.mock('../api/client', () => ({ api: { transfererPropriete: vi.fn() } }))
vi.mock('../auth/changementFoyer', () => ({ rechargerApplication: vi.fn() }))

function membre(overrides: Partial<HouseholdMember>): HouseholdMember {
  return { id: 10, username: 'conjoint', role: 'membre', created_at: '2026-01-02T00:00:00', detenteur_ids: [], ...overrides }
}

const CANDIDATS = [membre({ id: 10, username: 'conjoint' }), membre({ id: 11, username: 'enfant', nom: 'Léa' })]

function rendre(onClose = vi.fn()) {
  render(<TransfertProprieteModale membres={CANDIDATS} onClose={onClose} />)
  return onClose
}

describe('TransfertProprieteModale (§ BK.2c)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('propose les membres proposés par l’appelant, sans champ de confirmation tant qu’aucun n’est choisi', () => {
    rendre()

    expect(screen.getByRole('heading', { name: 'Transférer la propriété du foyer' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'conjoint' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'enfant (Léa)' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Pour confirmer/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transférer la propriété' })).toBeDisabled()
  })

  it('exige le nom d’utilisateur exact du destinataire, puis transfère et recharge l’application', async () => {
    vi.mocked(api.transfererPropriete).mockResolvedValue({} as AuthUser)
    rendre()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '11' } })
    const champ = screen.getByLabelText("Pour confirmer, saisis son nom d'utilisateur : enfant")
    const confirmer = screen.getByRole('button', { name: 'Transférer la propriété' })
    expect(confirmer).toBeDisabled()

    // Le nom d'un AUTRE membre ne suffit pas.
    fireEvent.change(champ, { target: { value: 'conjoint' } })
    expect(confirmer).toBeDisabled()

    fireEvent.change(champ, { target: { value: 'enfant' } })
    expect(confirmer).toBeEnabled()
    fireEvent.click(confirmer)

    await waitFor(() => expect(rechargerApplication).toHaveBeenCalledTimes(1))
    expect(api.transfererPropriete).toHaveBeenCalledWith(11, 'enfant')
  })

  it('changer de destinataire vide la confirmation déjà saisie', () => {
    rendre()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/Pour confirmer/), { target: { value: 'conjoint' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '11' } })

    expect(screen.getByLabelText(/Pour confirmer/)).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Transférer la propriété' })).toBeDisabled()
  })

  it('un refus du serveur s’affiche et ne recharge rien', async () => {
    vi.mocked(api.transfererPropriete).mockRejectedValue(new Error('Rôle insuffisant.'))
    rendre()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/Pour confirmer/), { target: { value: 'conjoint' } })
    fireEvent.click(screen.getByRole('button', { name: 'Transférer la propriété' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Rôle insuffisant.')
    expect(rechargerApplication).not.toHaveBeenCalled()
  })

  it('annuler ferme sans rien appeler', () => {
    const onClose = rendre()

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onClose).toHaveBeenCalled()
    expect(api.transfererPropriete).not.toHaveBeenCalled()
  })
})
