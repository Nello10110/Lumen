import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Compte, Detenteur, Holding, Loan } from '../api/types'
import AjoutHoldingForm from './AjoutHoldingForm'

// Seuls les ajouts du lot 3 (§ BN.1) sont verrouillés ici : le bloc « Qui le détient » et les `quotites`
// envoyées à la création. Le reste du formulaire est couvert par PortefeuillePage.test.tsx.
vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
    listComptes: vi.fn().mockResolvedValue([]),
    listEtablissements: vi.fn().mockResolvedValue([]),
    getCompteQuotites: vi.fn(),
    createHolding: vi.fn(),
    createLoan: vi.fn(),
  },
}))

const HORODATAGE = '2026-01-01T00:00:00'
const ALICE: Detenteur = { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE }
const BOB: Detenteur = { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE }

/** Les pourcentages français s'écrivent avec une espace insécable : on la normalise. */
const normaliser = (texte: string | null) => (texte ?? '').replace(/[  ]/g, ' ')

function compte(overrides: Partial<Compte> = {}): Compte {
  return { id: 3, nom: 'PEA', etablissement: null, created_at: HORODATAGE, updated_at: HORODATAGE, ...overrides }
}

async function rendre(comptes: Compte[] = []) {
  const onCreated = vi.fn()
  const onLoanCreated = vi.fn()
  render(
    <AjoutHoldingForm
      sansCarte
      autoriserEmprunt
      comptes={comptes}
      etablissements={[]}
      onCreated={onCreated}
      onLoanCreated={onLoanCreated}
      onImmobilier={vi.fn()}
    />,
  )
  await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
  // Laisse le temps à la liste des membres d'arriver (et aux parts égales d'être posées).
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  return { onCreated, onLoanCreated }
}

function remplirActif() {
  fireEvent.change(screen.getByLabelText("Type d'actif"), { target: { value: 'STOCK' } })
  fireEvent.change(screen.getByPlaceholderText('AAPL'), { target: { value: 'AAPL' } })
  fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '5' } })
}

function remplirEmprunt() {
  fireEvent.click(screen.getByRole('button', { name: 'Un emprunt' }))
  fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'Crédit' } })
  fireEvent.change(screen.getByLabelText('Capital initial'), { target: { value: '200000' } })
  fireEvent.change(screen.getByLabelText('Taux annuel (%)'), { target: { value: '3.5' } })
  fireEvent.change(screen.getByLabelText('Mensualité'), { target: { value: '1200' } })
  fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2020-01-01' } })
  fireEvent.change(screen.getByLabelText('Durée (mois)'), { target: { value: '240' } })
}

function enteteBloc() {
  return screen.getByRole('button', { name: /Qui le détient/ })
}

function resumeBloc() {
  return normaliser(enteteBloc().textContent)
}

function ouvrirBloc() {
  fireEvent.click(enteteBloc())
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE, BOB])
  vi.mocked(api.listComptes).mockResolvedValue([])
  vi.mocked(api.createHolding).mockResolvedValue({ id: 1, ticker: 'AAPL' } as Holding)
  vi.mocked(api.createLoan).mockResolvedValue({ id: 1 } as Loan)
})

describe('AjoutHoldingForm — « Qui le détient » (§ BN.1, lot 3)', () => {
  it('le bloc est replié et son résumé dit ce qui sera enregistré : « Alice 50 % · Bob 50 % »', async () => {
    await rendre()

    expect(enteteBloc()).toHaveAttribute('aria-expanded', 'false')
    expect(resumeBloc()).toContain('Alice 50 % · Bob 50 %')
    expect(screen.queryByLabelText('Part de Alice (%)')).not.toBeInTheDocument()
  })

  it('ouvert, le bloc permet de changer les parts et le résumé suit : Alice 70, Bob 30', async () => {
    await rendre()
    ouvrirBloc()

    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '30' } })

    expect(resumeBloc()).toContain('Alice 70 % · Bob 30 %')
  })

  it('createHolding reçoit les `quotites` proposées (parts égales) sans que l\'utilisateur ait ouvert le bloc', async () => {
    await rendre()
    remplirActif()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createHolding).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createHolding).mock.calls[0][0].quotites).toEqual([
      { detenteur_id: 1, quotite_pct: 50 },
      { detenteur_id: 2, quotite_pct: 50 },
    ])
  })

  it('createHolding reçoit la répartition choisie par l\'utilisateur', async () => {
    await rendre()
    remplirActif()
    ouvrirBloc()
    fireEvent.click(screen.getByRole('button', { name: '100 % Bob' }))

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createHolding).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createHolding).mock.calls[0][0].quotites).toEqual([{ detenteur_id: 2, quotite_pct: 100 }])
  })

  it('avec un seul membre, le résumé dit « Alice 100 % » et createHolding envoie 100 % pour lui', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE])
    await rendre()
    remplirActif()

    expect(resumeBloc()).toContain('Alice 100 %')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createHolding).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createHolding).mock.calls[0][0].quotites).toEqual([{ detenteur_id: 1, quotite_pct: 100 }])
  })

  it('toutes les parts à zéro : le résumé le dit, le bouton reste actif et `quotites` vaut [] (ne pas répartir, en connaissance de cause)', async () => {
    await rendre()
    remplirActif()
    ouvrirBloc()
    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '0' } })

    expect(resumeBloc()).toContain('aucune part (la ligne reste au foyer entier)')
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createHolding).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createHolding).mock.calls[0][0].quotites).toEqual([])
  })

  it('foyer sans membre : aucun bloc « Qui le détient » et `quotites` est absent du payload (le serveur décide)', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    await rendre()
    remplirActif()

    expect(screen.queryByRole('button', { name: /Qui le détient/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createHolding).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createHolding).mock.calls[0][0].quotites).toBeUndefined()
  })

  it('liste des membres illisible (403) : même comportement qu\'un foyer sans membre', async () => {
    vi.mocked(api.listDetenteurs).mockRejectedValue(new Error('Accès refusé'))
    await rendre()
    remplirActif()

    expect(screen.queryByRole('button', { name: /Qui le détient/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createHolding).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createHolding).mock.calls[0][0].quotites).toBeUndefined()
  })

  it("le bouton « Ajouter » est désactivé tant que le total n'est pas 100 %, et aucune création ne part", async () => {
    await rendre()
    remplirActif()
    ouvrirBloc()
    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '50' } })

    const ajouter = screen.getByRole('button', { name: 'Ajouter' })
    expect(ajouter).toBeDisabled()
    fireEvent.click(ajouter)
    expect(api.createHolding).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '40' } })
    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeEnabled()
  })

  it('après une création réussie, la répartition revient aux parts égales pour la ligne suivante', async () => {
    await rendre()
    remplirActif()
    ouvrirBloc()
    fireEvent.click(screen.getByRole('button', { name: '100 % Bob' }))
    expect(resumeBloc()).toContain('Bob 100 %')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(resumeBloc()).toContain('Alice 50 % · Bob 50 %'))
  })

  it("une ligne ajoutée à un compte dont toutes les lignes ont la même répartition reprend celle du compte (70/30)", async () => {
    vi.mocked(api.getCompteQuotites).mockResolvedValue({
      quotites: [
        { detenteur_id: 1, quotite_pct: 70 },
        { detenteur_id: 2, quotite_pct: 30 },
      ],
      uniforme: true,
    })
    await rendre([compte({ id: 3, nom: 'PEA' })])

    fireEvent.change(screen.getByLabelText('Compte'), { target: { value: '3' } })

    await waitFor(() => expect(resumeBloc()).toContain('Alice 70 % · Bob 30 %'))
    expect(api.getCompteQuotites).toHaveBeenCalledWith(3)
  })

  it("un compte dont les lignes ont des répartitions différentes (uniforme: false) ne change pas la proposition : parts égales", async () => {
    vi.mocked(api.getCompteQuotites).mockResolvedValue({ quotites: [{ detenteur_id: 1, quotite_pct: 100 }], uniforme: false })
    await rendre([compte({ id: 3, nom: 'PEA' })])

    fireEvent.change(screen.getByLabelText('Compte'), { target: { value: '3' } })

    await waitFor(() => expect(api.getCompteQuotites).toHaveBeenCalledWith(3))
    expect(resumeBloc()).toContain('Alice 50 % · Bob 50 %')
  })

  it("la répartition du compte n'écrase pas un choix déjà fait par l'utilisateur", async () => {
    vi.mocked(api.getCompteQuotites).mockResolvedValue({ quotites: [{ detenteur_id: 1, quotite_pct: 100 }], uniforme: true })
    await rendre([compte({ id: 3, nom: 'PEA' })])
    ouvrirBloc()
    fireEvent.click(screen.getByRole('button', { name: '100 % Bob' }))

    fireEvent.change(screen.getByLabelText('Compte'), { target: { value: '3' } })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(resumeBloc()).toContain('Bob 100 %')
  })

  it("avec au moins deux membres, la liste des comptes distingue deux comptes homonymes par leurs membres : « PEA · Alice, Bob »", async () => {
    await rendre([compte({ id: 3, nom: 'PEA', membres_ids: [1, 2] }), compte({ id: 4, nom: 'CTO', membres_ids: [2] })])

    expect(screen.getByRole('option', { name: 'PEA · Alice, Bob' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'CTO · Bob' })).toBeInTheDocument()
  })
})

describe('AjoutHoldingForm — mode emprunt (§ BN.1, lot 3)', () => {
  it('createLoan reçoit les `quotites` (le bloc « Qui le détient » est aussi dans le mode emprunt)', async () => {
    await rendre()
    remplirEmprunt()
    expect(resumeBloc()).toContain('Alice 50 % · Bob 50 %')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createLoan).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createLoan).mock.calls[0][0].quotites).toEqual([
      { detenteur_id: 1, quotite_pct: 50 },
      { detenteur_id: 2, quotite_pct: 50 },
    ])
    expect(api.createHolding).not.toHaveBeenCalled()
  })

  it("createLoan reçoit la répartition choisie (100 % Alice)", async () => {
    await rendre()
    remplirEmprunt()
    ouvrirBloc()
    fireEvent.click(screen.getByRole('button', { name: '100 % Alice' }))

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createLoan).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createLoan).mock.calls[0][0].quotites).toEqual([{ detenteur_id: 1, quotite_pct: 100 }])
  })

  it("le bouton « Ajouter » d'un emprunt est désactivé tant que le total n'est pas 100 %", async () => {
    await rendre()
    remplirEmprunt()
    ouvrirBloc()

    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '10' } })

    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled()
    expect(api.createLoan).not.toHaveBeenCalled()
  })

  it('foyer sans membre : `quotites` est absent du payload de l\'emprunt', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    await rendre()
    remplirEmprunt()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createLoan).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.createLoan).mock.calls[0][0].quotites).toBeUndefined()
  })
})
