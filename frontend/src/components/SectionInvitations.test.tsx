import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Invitation } from '../api/types'
import SectionInvitations from './SectionInvitations'

vi.mock('../api/client', () => ({
  api: {
    listInvitations: vi.fn(),
    listDetenteurs: vi.fn(),
    createInvitation: vi.fn(),
    revoquerInvitation: vi.fn(),
  },
}))

const AUCUNE = "Aucune invitation pour l'instant."

function invitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: 1,
    role: 'membre',
    libelle: null,
    statut: 'en_attente',
    cree_le: '2026-09-30T10:00:00',
    expire_le: '2026-10-07T10:00:00',
    utilisee_le: null,
    utilisee_par: null,
    revoquee_le: null,
    detenteur_ids: [],
    ...overrides,
  }
}

describe('SectionInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.listInvitations).mockResolvedValue([])
    vi.mocked(api.listDetenteurs).mockResolvedValue([
      { id: 1, nom: 'Alice', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
      { id: 2, nom: 'Bob', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
    ])
  })

  it('crée une invitation (membre, 7 jours par défaut) et montre le lien complet, avec le jeton dans le fragment', async () => {
    vi.mocked(api.createInvitation).mockResolvedValue({ ...invitation({ id: 5 }), jeton: 'jeton_secret-42' })
    render(<SectionInvitations />)
    await screen.findByText(AUCUNE)

    fireEvent.click(screen.getByRole('button', { name: "Créer l'invitation" }))

    const champ = await screen.findByLabelText("Lien d'invitation")
    expect(champ).toHaveValue(`${window.location.origin}/invitation#jeton_secret-42`)
    expect(api.createInvitation).toHaveBeenCalledWith({ role: 'membre', duree_jours: 7, libelle: undefined, detenteur_ids: undefined })
    expect(screen.getByText(/il ne sera plus affiché/)).toBeInTheDocument()
    // La liste est rechargée, sans jamais reporter le jeton.
    expect(api.listInvitations).toHaveBeenCalledTimes(2)
  })

  it('envoie le libellé, la durée et — pour un invité — les détenteurs cochés', async () => {
    vi.mocked(api.createInvitation).mockResolvedValue({ ...invitation({ role: 'invite' }), jeton: 'j' })
    render(<SectionInvitations />)
    await screen.findByText(AUCUNE)

    fireEvent.change(screen.getByLabelText('Rôle proposé'), { target: { value: 'invite' } })
    fireEvent.change(screen.getByLabelText('Validité du lien'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('Pour qui ? (facultatif)'), { target: { value: '  Sophie  ' } })
    fireEvent.click(screen.getByLabelText('Bob'))
    fireEvent.click(screen.getByRole('button', { name: "Créer l'invitation" }))

    await screen.findByLabelText("Lien d'invitation")
    expect(api.createInvitation).toHaveBeenCalledWith({ role: 'invite', duree_jours: 30, libelle: 'Sophie', detenteur_ids: [2] })
  })

  it('les détenteurs ne sont proposés qu’à un invité', async () => {
    render(<SectionInvitations />)
    await screen.findByText(AUCUNE)

    expect(screen.queryByLabelText('Bob')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Rôle proposé'), { target: { value: 'invite' } })
    expect(screen.getByLabelText('Bob')).toBeInTheDocument()
  })

  it('masquer fait disparaître le lien', async () => {
    vi.mocked(api.createInvitation).mockResolvedValue({ ...invitation(), jeton: 'j' })
    render(<SectionInvitations />)
    await screen.findByText(AUCUNE)
    fireEvent.click(screen.getByRole('button', { name: "Créer l'invitation" }))
    await screen.findByLabelText("Lien d'invitation")

    fireEvent.click(screen.getByRole('button', { name: 'Masquer' }))

    expect(screen.queryByLabelText("Lien d'invitation")).not.toBeInTheDocument()
  })

  it('copie le lien dans le presse-papiers', async () => {
    const ecrire = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: ecrire }, configurable: true })
    vi.mocked(api.createInvitation).mockResolvedValue({ ...invitation(), jeton: 'jeton_a_copier' })
    render(<SectionInvitations />)
    await screen.findByText(AUCUNE)
    fireEvent.click(screen.getByRole('button', { name: "Créer l'invitation" }))
    await screen.findByLabelText("Lien d'invitation")

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien' }))

    await screen.findByRole('button', { name: 'Lien copié' })
    expect(ecrire).toHaveBeenCalledWith(`${window.location.origin}/invitation#jeton_a_copier`)
  })

  it('liste les invitations avec leur statut, et qui a accepté', async () => {
    vi.mocked(api.listInvitations).mockResolvedValue([
      invitation({ id: 1, libelle: 'Sophie', statut: 'en_attente' }),
      invitation({ id: 2, role: 'invite', statut: 'acceptee', utilisee_le: '2026-09-29T08:00:00', utilisee_par: 'marc' }),
      invitation({ id: 3, statut: 'revoquee' }),
      invitation({ id: 4, statut: 'expiree' }),
    ])
    render(<SectionInvitations />)

    await screen.findByText('Sophie')
    expect(screen.getByText('En attente')).toBeInTheDocument()
    expect(screen.getByText('Acceptée')).toBeInTheDocument()
    expect(screen.getByText('Révoquée')).toBeInTheDocument()
    expect(screen.getByText('Expirée')).toBeInTheDocument()
    expect(screen.getByText(/Acceptée par marc le/)).toBeInTheDocument()
  })

  it('seules les invitations en attente se révoquent', async () => {
    vi.mocked(api.listInvitations).mockResolvedValue([
      invitation({ id: 1, libelle: 'Sophie', statut: 'en_attente' }),
      invitation({ id: 2, libelle: 'Marc', statut: 'acceptee', utilisee_le: '2026-09-29T08:00:00', utilisee_par: 'marc' }),
    ])
    vi.mocked(api.revoquerInvitation).mockResolvedValue(undefined)
    render(<SectionInvitations />)
    await screen.findByText('Sophie')

    expect(screen.getAllByRole('button', { name: /^Révoquer/ })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: "Révoquer l'invitation Sophie" }))

    await waitFor(() => expect(api.revoquerInvitation).toHaveBeenCalledWith(1))
    await waitFor(() => expect(api.listInvitations).toHaveBeenCalledTimes(2))
  })

  it('une révocation refusée (409) affiche le message du serveur', async () => {
    vi.mocked(api.listInvitations).mockResolvedValue([invitation({ id: 1, libelle: 'Sophie' })])
    vi.mocked(api.revoquerInvitation).mockRejectedValue(new Error("Cette invitation n'est plus en attente."))
    render(<SectionInvitations />)
    await screen.findByText('Sophie')

    fireEvent.click(screen.getByRole('button', { name: "Révoquer l'invitation Sophie" }))

    expect(await screen.findByText("Cette invitation n'est plus en attente.")).toBeInTheDocument()
  })

  it('une création refusée affiche l’erreur sans montrer de lien', async () => {
    vi.mocked(api.createInvitation).mockRejectedValue(new Error('Membre du foyer introuvable'))
    render(<SectionInvitations />)
    await screen.findByText(AUCUNE)

    fireEvent.click(screen.getByRole('button', { name: "Créer l'invitation" }))

    const alertes = await screen.findAllByRole('alert')
    expect(within(alertes[0]).getByText('Membre du foyer introuvable')).toBeInTheDocument()
    expect(screen.queryByLabelText("Lien d'invitation")).not.toBeInTheDocument()
  })
})
