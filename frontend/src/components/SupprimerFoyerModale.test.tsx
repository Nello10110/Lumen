import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { ApercuSuppressionFoyer, AuthUser } from '../api/types'
import { rechargerApplication } from '../auth/changementFoyer'
import SupprimerFoyerModale from './SupprimerFoyerModale'

vi.mock('../api/client', () => ({
  api: { apercuSuppressionFoyer: vi.fn(), supprimerFoyer: vi.fn(), downloadExportDonnees: vi.fn() },
}))
vi.mock('../auth/changementFoyer', () => ({ rechargerApplication: vi.fn() }))

function apercu(overrides: Partial<ApercuSuppressionFoyer> = {}): ApercuSuppressionFoyer {
  return {
    foyer_nom: 'Chez nous',
    confirmation_attendue: 'Chez nous',
    patrimoine: { comptes: 3, holdings: 12 },
    liens_partage: 2,
    invitations: 1,
    comptes: 3,
    comptes_sans_foyer: 2,
    comptes_gardant_un_foyer: 1,
    ...overrides,
  }
}

describe('SupprimerFoyerModale (§ BK.2c)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.apercuSuppressionFoyer).mockResolvedValue(apercu())
    URL.createObjectURL = vi.fn(() => 'blob:factice')
    URL.revokeObjectURL = vi.fn()
  })

  it('montre ce qui sera effacé et le sort des comptes, lus sur l’aperçu du serveur', async () => {
    render(<SupprimerFoyerModale onClose={vi.fn()} />)

    expect(await screen.findByText('lignes de patrimoine')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('2 liens de partage')).toBeInTheDocument()
    expect(screen.getByText('1 invitation')).toBeInTheDocument()
    expect(screen.getByText(/Le foyer compte 3 comptes \(le vôtre compris\)\. Aucun n'est supprimé\./)).toBeInTheDocument()
    expect(screen.getByText(/2 comptes se retrouveront sans foyer/)).toBeInTheDocument()
    expect(screen.getByText(/1 compte appartient aussi à un autre foyer/)).toBeInTheDocument()
  })

  it('propose d’exporter les données avant la suppression', async () => {
    vi.mocked(api.downloadExportDonnees).mockResolvedValue(new Blob(['{}'], { type: 'application/json' }))
    render(<SupprimerFoyerModale onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /Exporter mes données/ }))

    await waitFor(() => expect(api.downloadExportDonnees).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Export téléchargé.')).toBeInTheDocument()
    expect(api.supprimerFoyer).not.toHaveBeenCalled()
  })

  it('exige le nom du foyer donné par le serveur, puis supprime et recharge l’application', async () => {
    vi.mocked(api.supprimerFoyer).mockResolvedValue({} as AuthUser)
    render(<SupprimerFoyerModale onClose={vi.fn()} />)

    const champ = await screen.findByLabelText('Confirmation de la suppression du foyer')
    const supprimer = screen.getByRole('button', { name: 'Supprimer définitivement le foyer' })
    expect(supprimer).toBeDisabled()

    fireEvent.change(champ, { target: { value: 'chez nous' } })
    expect(supprimer).toBeDisabled()

    fireEvent.change(champ, { target: { value: 'Chez nous' } })
    expect(supprimer).toBeEnabled()
    fireEvent.click(supprimer)

    await waitFor(() => expect(rechargerApplication).toHaveBeenCalledTimes(1))
    expect(api.supprimerFoyer).toHaveBeenCalledWith('Chez nous')
  })

  it('un foyer sans nom se confirme par la phrase par défaut du serveur', async () => {
    vi.mocked(api.apercuSuppressionFoyer).mockResolvedValue(
      apercu({ foyer_nom: null, confirmation_attendue: 'SUPPRIMER', patrimoine: {}, liens_partage: 0, invitations: 0 }),
    )
    render(<SupprimerFoyerModale onClose={vi.fn()} />)

    expect(await screen.findByText('Aucune donnée de patrimoine.')).toBeInTheDocument()
    expect(screen.getByText(/tapez exactement « SUPPRIMER »/)).toBeInTheDocument()
  })

  it('un refus du serveur s’affiche et ne recharge rien', async () => {
    vi.mocked(api.supprimerFoyer).mockRejectedValue(new Error('Confirmation incorrecte.'))
    render(<SupprimerFoyerModale onClose={vi.fn()} />)

    fireEvent.change(await screen.findByLabelText('Confirmation de la suppression du foyer'), { target: { value: 'Chez nous' } })
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement le foyer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Confirmation incorrecte.')
    expect(rechargerApplication).not.toHaveBeenCalled()
  })

  it('un aperçu qui échoue s’affiche, sans champ de confirmation', async () => {
    vi.mocked(api.apercuSuppressionFoyer).mockRejectedValue(new Error('Rôle insuffisant.'))
    render(<SupprimerFoyerModale onClose={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Rôle insuffisant.')
    expect(screen.queryByLabelText('Confirmation de la suppression du foyer')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer définitivement le foyer' })).toBeDisabled()
  })
})
