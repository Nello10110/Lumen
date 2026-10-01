import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Invitation, InvitationCreee } from '../api/types'
import SectionLiensFoyer, { type SourceLiensFoyer } from './SectionLiensFoyer'

function lien(surcharge: Partial<Invitation> = {}): Invitation {
  return {
    id: 1,
    role: 'proprietaire',
    libelle: 'Famille Martin',
    statut: 'en_attente',
    cree_le: '2026-10-01T10:00:00',
    expire_le: '2026-10-08T10:00:00',
    utilisee_le: null,
    utilisee_par: null,
    revoquee_le: null,
    detenteur_ids: [],
    ...surcharge,
  }
}

function source(): SourceLiensFoyer {
  return {
    listInvitationsFoyer: vi.fn().mockResolvedValue([]),
    createInvitationFoyer: vi.fn(),
    revoquerInvitationFoyer: vi.fn().mockResolvedValue(undefined),
  }
}

describe('SectionLiensFoyer', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('crée un lien « créer votre foyer », le montre une fois avec son fragment, et le copie', async () => {
    const s = source()
    const cree: InvitationCreee = { ...lien({ id: 7 }), jeton: 'jeton_secret-42' }
    vi.mocked(s.createInvitationFoyer).mockResolvedValue(cree)
    render(<SectionLiensFoyer source={s} />)

    fireEvent.change(screen.getByLabelText('Pour qui ? (facultatif)'), { target: { value: ' Famille Martin ' } })
    fireEvent.change(screen.getByLabelText('Validité du lien'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer le lien' }))

    const champ = await screen.findByLabelText('Lien pour créer un foyer')
    expect(s.createInvitationFoyer).toHaveBeenCalledWith({ duree_jours: 30, libelle: 'Famille Martin' })
    // Le jeton voyage dans le fragment : ni dans le chemin ni dans la requête.
    expect(champ).toHaveValue(`${window.location.origin}/invitation#jeton_secret-42`)

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien' }))
    expect(await screen.findByRole('button', { name: 'Lien copié' })).toBeInTheDocument()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/invitation#jeton_secret-42`)

    fireEvent.click(screen.getByRole('button', { name: 'Masquer' }))
    expect(screen.queryByLabelText('Lien pour créer un foyer')).not.toBeInTheDocument()
  })

  it('liste les liens avec leur état, et ne propose de révoquer que ceux en attente', async () => {
    const s = source()
    vi.mocked(s.listInvitationsFoyer).mockResolvedValue([
      lien({ id: 1 }),
      lien({ id: 2, libelle: 'Léa', statut: 'acceptee', utilisee_le: '2026-10-02T08:00:00', utilisee_par: 'lea' }),
      lien({ id: 3, libelle: null, statut: 'expiree' }),
    ])
    render(<SectionLiensFoyer source={s} />)

    const attente = (await screen.findByText('Famille Martin')).closest('li') as HTMLElement
    expect(within(attente).getByText('En attente')).toBeInTheDocument()
    expect(within(attente).getByRole('button', { name: 'Révoquer l\'invitation Famille Martin' })).toBeInTheDocument()

    const acceptee = screen.getByText('Léa').closest('li') as HTMLElement
    expect(within(acceptee).getByText(/Acceptée par lea/)).toBeInTheDocument()
    expect(within(acceptee).queryByRole('button', { name: /Révoquer/ })).not.toBeInTheDocument()

    const expiree = screen.getByText('Sans libellé').closest('li') as HTMLElement
    expect(within(expiree).getByText('Expirée')).toBeInTheDocument()
  })

  it('révoque un lien en attente puis recharge la liste', async () => {
    const s = source()
    vi.mocked(s.listInvitationsFoyer).mockResolvedValueOnce([lien()]).mockResolvedValue([lien({ statut: 'revoquee' })])
    render(<SectionLiensFoyer source={s} />)

    fireEvent.click(await screen.findByRole('button', { name: "Révoquer l'invitation Famille Martin" }))

    await vi.waitFor(() => expect(s.revoquerInvitationFoyer).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Révoquée')).toBeInTheDocument()
  })

  it('affiche le refus de la création (mode fermé côté serveur) sans lien', async () => {
    const s = source()
    vi.mocked(s.createInvitationFoyer).mockRejectedValue(new Error("Sur cette installation, seul l'opérateur peut créer un foyer."))
    render(<SectionLiensFoyer source={s} />)

    fireEvent.click(screen.getByRole('button', { name: 'Créer le lien' }))

    expect(await screen.findByText(/seul l'opérateur peut créer un foyer/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Lien pour créer un foyer')).not.toBeInTheDocument()
  })
})
