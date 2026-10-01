import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiOperateur } from '../../api/client'
import type { FoyerOperateur } from '../../api/types'
import FoyersOperateurCard from './FoyersOperateurCard'

vi.mock('../../api/client', () => ({
  apiOperateur: {
    listFoyers: vi.fn(),
    suspendreFoyer: vi.fn(),
    reactiverFoyer: vi.fn(),
    supprimerFoyer: vi.fn(),
    listComptesDuFoyer: vi.fn(),
    designerProprietaire: vi.fn(),
  },
}))

const DUPONT: FoyerOperateur = {
  id: 10,
  nom: 'Famille Dupont',
  langue: 'fr',
  statut: 'actif',
  cree_le: '2026-09-01T10:00:00',
  suspendu_le: null,
  derniere_activite: '2026-09-30T08:30:00',
  proprietaire: 'alice',
  nombre_comptes: 3,
  confirmation_attendue: 'Famille Dupont',
}

const SANS_NOM: FoyerOperateur = {
  ...DUPONT,
  id: 11,
  nom: null,
  proprietaire: null,
  nombre_comptes: 1,
  derniere_activite: null,
  confirmation_attendue: 'SUPPRIMER',
}

function ligne(cible: string | HTMLElement) {
  const element = typeof cible === 'string' ? screen.getByText(cible) : cible
  return element.closest('li') as HTMLElement
}

describe('FoyersOperateurCard', () => {
  beforeEach(() => {
    vi.mocked(apiOperateur.listFoyers).mockResolvedValue([DUPONT, SANS_NOM])
    for (const f of [
      apiOperateur.suspendreFoyer,
      apiOperateur.reactiverFoyer,
      apiOperateur.supprimerFoyer,
      apiOperateur.listComptesDuFoyer,
      apiOperateur.designerProprietaire,
    ]) {
      vi.mocked(f).mockReset()
    }
  })

  it('liste les foyers : nom, statut, propriétaire, comptes, création et dernière activité', async () => {
    render(<FoyersOperateurCard />)

    const dupont = ligne(await screen.findByText('Famille Dupont'))
    expect(within(dupont).getByText('Actif')).toBeInTheDocument()
    expect(within(dupont).getByText('alice')).toBeInTheDocument()
    expect(within(dupont).getByText('3')).toBeInTheDocument()
    expect(within(dupont).getByText('01/09/2026')).toBeInTheDocument()

    const anonyme = ligne('Foyer sans nom')
    expect(within(anonyme).getByText('aucun')).toBeInTheDocument()
    expect(within(anonyme).getByText('jamais')).toBeInTheDocument()
  })

  it('suspend un foyer actif puis le réactive, avec la réponse du serveur', async () => {
    vi.mocked(apiOperateur.suspendreFoyer).mockResolvedValue({ ...DUPONT, statut: 'suspendu', suspendu_le: '2026-10-01T09:00:00' })
    vi.mocked(apiOperateur.reactiverFoyer).mockResolvedValue(DUPONT)
    render(<FoyersOperateurCard />)

    const dupont = ligne(await screen.findByText('Famille Dupont'))
    fireEvent.click(within(dupont).getByRole('button', { name: 'Suspendre' }))

    expect(await within(ligne('Famille Dupont')).findByText('Suspendu')).toBeInTheDocument()
    expect(apiOperateur.suspendreFoyer).toHaveBeenCalledWith(10)
    fireEvent.click(within(ligne('Famille Dupont')).getByRole('button', { name: 'Réactiver' }))

    expect(await within(ligne('Famille Dupont')).findByText('Actif')).toBeInTheDocument()
    expect(apiOperateur.reactiverFoyer).toHaveBeenCalledWith(10)
  })

  it("montre l'erreur du serveur quand la suspension échoue", async () => {
    vi.mocked(apiOperateur.suspendreFoyer).mockRejectedValue(new Error('Foyer introuvable'))
    render(<FoyersOperateurCard />)

    fireEvent.click(within(ligne(await screen.findByText('Famille Dupont'))).getByRole('button', { name: 'Suspendre' }))

    expect(await screen.findByText('Foyer introuvable')).toBeInTheDocument()
  })

  it('la suppression exige la saisie exacte de confirmation_attendue, puis recharge la liste et prévient le parent', async () => {
    vi.mocked(apiOperateur.supprimerFoyer).mockResolvedValue(undefined)
    const onFoyerSupprime = vi.fn()
    render(<FoyersOperateurCard onFoyerSupprime={onFoyerSupprime} />)

    fireEvent.click(within(ligne(await screen.findByText('Famille Dupont'))).getByRole('button', { name: 'Supprimer' }))
    const modale = await screen.findByRole('dialog')
    const bouton = within(modale).getByRole('button', { name: 'Supprimer définitivement le foyer' })
    expect(bouton).toBeDisabled()
    fireEvent.change(within(modale).getByLabelText('Confirmation de la suppression'), { target: { value: 'famille dupont' } })
    expect(bouton).toBeDisabled()
    fireEvent.change(within(modale).getByLabelText('Confirmation de la suppression'), { target: { value: 'Famille Dupont' } })
    expect(bouton).toBeEnabled()
    vi.mocked(apiOperateur.listFoyers).mockResolvedValue([SANS_NOM])
    fireEvent.click(bouton)

    await vi.waitFor(() => expect(apiOperateur.supprimerFoyer).toHaveBeenCalledWith(10, 'Famille Dupont'))
    await vi.waitFor(() => expect(screen.queryByText('Famille Dupont')).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onFoyerSupprime).toHaveBeenCalledTimes(1)
  })

  it('un foyer sans nom se supprime en tapant SUPPRIMER', async () => {
    render(<FoyersOperateurCard />)

    fireEvent.click(within(ligne(await screen.findByText('Foyer sans nom'))).getByRole('button', { name: 'Supprimer' }))
    const modale = await screen.findByRole('dialog')

    expect(within(modale).getByText(/saisis « SUPPRIMER »/)).toBeInTheDocument()
  })

  it("garde la fenêtre ouverte et affiche l'erreur quand le serveur refuse la suppression", async () => {
    vi.mocked(apiOperateur.supprimerFoyer).mockRejectedValue(new Error('Confirmation incorrecte.'))
    render(<FoyersOperateurCard />)

    fireEvent.click(within(ligne(await screen.findByText('Famille Dupont'))).getByRole('button', { name: 'Supprimer' }))
    const modale = await screen.findByRole('dialog')
    fireEvent.change(within(modale).getByLabelText('Confirmation de la suppression'), { target: { value: 'Famille Dupont' } })
    fireEvent.click(within(modale).getByRole('button', { name: 'Supprimer définitivement le foyer' }))

    expect(await within(modale).findByText('Confirmation incorrecte.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('désigne un nouveau propriétaire parmi les membres seulement', async () => {
    vi.mocked(apiOperateur.listComptesDuFoyer).mockResolvedValue([
      { id: 1, username: 'alice', role: 'proprietaire' },
      { id: 2, username: 'bob', role: 'membre' },
      { id: 3, username: 'chloe', role: 'invite' },
    ])
    vi.mocked(apiOperateur.designerProprietaire).mockResolvedValue({ ...DUPONT, proprietaire: 'bob' })
    render(<FoyersOperateurCard />)

    fireEvent.click(within(ligne(await screen.findByText('Famille Dupont'))).getByRole('button', { name: 'Désigner un propriétaire' }))
    const modale = await screen.findByRole('dialog')
    const choix = await within(modale).findByRole('combobox')

    expect(within(choix).getByRole('option', { name: 'bob' })).toBeInTheDocument()
    expect(within(choix).queryByRole('option', { name: 'chloe' })).not.toBeInTheDocument()
    expect(within(choix).queryByRole('option', { name: 'alice' })).not.toBeInTheDocument()
    const designer = within(modale).getByRole('button', { name: 'Désigner comme propriétaire' })
    expect(designer).toBeDisabled()
    fireEvent.change(choix, { target: { value: '2' } })
    fireEvent.click(designer)

    await vi.waitFor(() => expect(apiOperateur.designerProprietaire).toHaveBeenCalledWith(10, 2))
    expect(await within(ligne('Famille Dupont')).findByText('bob')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it("explique qu'aucun membre n'est désignable quand le foyer n'a que des invités", async () => {
    vi.mocked(apiOperateur.listComptesDuFoyer).mockResolvedValue([{ id: 3, username: 'chloe', role: 'invite' }])
    render(<FoyersOperateurCard />)

    fireEvent.click(within(ligne(await screen.findByText('Famille Dupont'))).getByRole('button', { name: 'Désigner un propriétaire' }))

    expect(await screen.findByText(/aucun membre à désigner/)).toBeInTheDocument()
  })

  it("affiche un état vide quand l'installation n'a aucun foyer", async () => {
    vi.mocked(apiOperateur.listFoyers).mockResolvedValue([])
    render(<FoyersOperateurCard />)

    expect(await screen.findByText('Aucun foyer.')).toBeInTheDocument()
  })
})
