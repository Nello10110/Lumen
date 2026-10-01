import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiOperateur } from '../../api/client'
import ComptesSansFoyerCard from './ComptesSansFoyerCard'

vi.mock('../../api/client', () => ({
  apiOperateur: { listComptesSansFoyer: vi.fn(), supprimerCompteSansFoyer: vi.fn() },
}))

const COMPTES = [
  { id: 5, username: 'denis', created_at: '2026-09-10T09:00:00', derniere_connexion: '2026-09-29T18:00:00' },
  { id: 6, username: 'eva', created_at: '2026-09-12T09:00:00', derniere_connexion: null },
]

describe('ComptesSansFoyerCard', () => {
  beforeEach(() => {
    vi.mocked(apiOperateur.listComptesSansFoyer).mockResolvedValue(COMPTES)
    vi.mocked(apiOperateur.supprimerCompteSansFoyer).mockReset()
  })

  it('liste les comptes sans foyer avec leur dernière connexion', async () => {
    render(<ComptesSansFoyerCard />)

    expect(await screen.findByText('denis')).toBeInTheDocument()
    expect(screen.getByText(/Créé le 10\/09\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/jamais connecté/)).toBeInTheDocument()
  })

  it("supprime un compte après confirmation par son nom d'utilisateur, puis recharge la liste", async () => {
    vi.mocked(apiOperateur.supprimerCompteSansFoyer).mockResolvedValue(undefined)
    render(<ComptesSansFoyerCard />)

    const ligne = (await screen.findByText('denis')).closest('li') as HTMLElement
    fireEvent.click(within(ligne).getByRole('button', { name: 'Supprimer' }))
    const modale = await screen.findByRole('dialog')
    const bouton = within(modale).getByRole('button', { name: 'Supprimer définitivement le compte' })
    expect(bouton).toBeDisabled()
    fireEvent.change(within(modale).getByLabelText('Confirmation de la suppression'), { target: { value: 'eva' } })
    expect(bouton).toBeDisabled()
    fireEvent.change(within(modale).getByLabelText('Confirmation de la suppression'), { target: { value: 'denis' } })
    vi.mocked(apiOperateur.listComptesSansFoyer).mockResolvedValue([COMPTES[1]])
    fireEvent.click(bouton)

    await vi.waitFor(() => expect(apiOperateur.supprimerCompteSansFoyer).toHaveBeenCalledWith(5, 'denis'))
    await vi.waitFor(() => expect(screen.queryByText('denis')).not.toBeInTheDocument())
    expect(screen.getByText('eva')).toBeInTheDocument()
  })

  it('affiche un état vide', async () => {
    vi.mocked(apiOperateur.listComptesSansFoyer).mockResolvedValue([])
    render(<ComptesSansFoyerCard />)

    expect(await screen.findByText('Aucun compte sans foyer.')).toBeInTheDocument()
  })
})
