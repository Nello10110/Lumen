import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { HouseholdMember } from '../api/types'
import GestionFoyerCard from './GestionFoyerCard'

vi.mock('../api/client', () => ({
  api: {
    listHouseholdMembers: vi.fn(),
    listDetenteurs: vi.fn(),
    listInvitations: vi.fn(),
    deleteHouseholdMember: vi.fn(),
    transfererPropriete: vi.fn(),
  },
}))
vi.mock('../auth/changementFoyer', () => ({ rechargerApplication: vi.fn() }))

function membre(overrides: Partial<HouseholdMember>): HouseholdMember {
  return { id: 10, username: 'conjoint', role: 'membre', created_at: '2026-01-02T00:00:00', detenteur_ids: [], ...overrides }
}

const PROPRIETAIRE = membre({ id: 1, username: 'testeur', role: 'proprietaire' })

describe('GestionFoyerCard — cycle de vie (§ BK.2c)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.listInvitations).mockResolvedValue([])
  })

  it('le transfert ne propose que les membres : un invité n’est jamais un destinataire possible', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      PROPRIETAIRE,
      membre({ id: 10, username: 'conjoint', role: 'membre' }),
      membre({ id: 11, username: 'stagiaire', role: 'invite' }),
    ])
    render(<GestionFoyerCard />)
    await screen.findByText('conjoint')

    fireEvent.click(screen.getByRole('button', { name: 'Transférer la propriété…' }))

    const modale = await screen.findByRole('dialog')
    expect(within(modale).getByRole('option', { name: 'conjoint' })).toBeInTheDocument()
    expect(within(modale).queryByRole('option', { name: 'stagiaire' })).not.toBeInTheDocument()
    expect(within(modale).queryByRole('option', { name: 'testeur' })).not.toBeInTheDocument()
  })

  it('sans autre membre (seulement un invité), explique pourquoi et ne propose pas le transfert', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([PROPRIETAIRE, membre({ id: 11, username: 'stagiaire', role: 'invite' })])
    render(<GestionFoyerCard />)
    await screen.findByText('stagiaire')

    expect(screen.queryByRole('button', { name: 'Transférer la propriété…' })).not.toBeInTheDocument()
    expect(screen.getByText(/il faut un autre membre dans le foyer/)).toBeInTheDocument()
  })

  it('retirer un membre l’écarte du foyer et le dit : son compte est conservé', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([PROPRIETAIRE, membre({ id: 10, username: 'conjoint' })])
    vi.mocked(api.deleteHouseholdMember).mockResolvedValue(undefined)
    render(<GestionFoyerCard />)
    await screen.findByText('conjoint')

    expect(screen.getByText(/son compte est conservé/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Supprimer le compte/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retirer conjoint du foyer' }))

    await waitFor(() => expect(api.deleteHouseholdMember).toHaveBeenCalledWith(10))
  })
})
