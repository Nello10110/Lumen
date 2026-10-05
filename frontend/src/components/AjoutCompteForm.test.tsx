import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Compte, Detenteur, Etablissement } from '../api/types'
import AjoutCompteForm from './AjoutCompteForm'

vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
    listComptes: vi.fn(),
    createCompte: vi.fn(),
    createHolding: vi.fn(),
    createEtablissement: vi.fn(),
    recupererLogoCatalogue: vi.fn(),
  },
}))

const HORODATAGE = '2026-01-01T00:00:00'
const ALICE: Detenteur = { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE }
const BOB: Detenteur = { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE }
const BANQUE: Etablissement = { id: 7, nom: 'Boursorama', logo_key: null, a_un_logo: false, logo_source: null, logo_maj_le: null, created_at: HORODATAGE, updated_at: HORODATAGE }

function compte(overrides: Partial<Compte> = {}): Compte {
  return { id: 9, nom: 'PEA', etablissement: BANQUE, created_at: HORODATAGE, updated_at: HORODATAGE, membres_ids: [1], ...overrides }
}

type Props = Partial<Parameters<typeof AjoutCompteForm>[0]>

/** Rend le formulaire et laisse le temps aux membres du foyer d'être lus (un utilisateur ne saisit pas en quelques ms). */
async function rendre(props: Props = {}) {
  const onCreated = props.onCreated ?? vi.fn()
  const onAjouterMembre = 'onAjouterMembre' in props ? props.onAjouterMembre : vi.fn()
  render(<AjoutCompteForm etablissements={[BANQUE]} {...props} onCreated={onCreated} onAjouterMembre={onAjouterMembre} />)
  await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  return { onCreated, onAjouterMembre }
}

function soumettre(nom: string) {
  fireEvent.change(screen.getByPlaceholderText('PEA, Livret A...'), { target: { value: nom } })
  fireEvent.change(screen.getByLabelText('Établissement'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Nouveau compte' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE, BOB])
  vi.mocked(api.listComptes).mockResolvedValue([compte()])
  vi.mocked(api.createCompte).mockResolvedValue(compte({ id: 10, nom: 'Livret B' }))
  vi.mocked(api.createHolding).mockResolvedValue({} as never)
})

describe('AjoutCompteForm — nom libre (§ BN.1, lot 3)', () => {
  it('un nom libre crée le compte normalement, sans panneau « existe déjà »', async () => {
    const { onCreated } = await rendre()

    soumettre('Livret B')

    await waitFor(() => expect(api.createCompte).toHaveBeenCalledWith('Livret B', 7))
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/existe déjà/)).not.toBeInTheDocument()
  })

  it('une vraie erreur du serveur (nom libre, mais échec) s\'affiche en erreur ordinaire, pas en panneau homonyme', async () => {
    vi.mocked(api.createCompte).mockRejectedValue(new Error('Base indisponible'))
    const { onCreated } = await rendre()

    soumettre('Livret B')

    expect(await screen.findByText('Base indisponible')).toBeInTheDocument()
    expect(screen.queryByText(/existe déjà/)).not.toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
  })
})

describe('AjoutCompteForm — compte homonyme (§ BN.1, lot 3)', () => {
  it("un nom déjà pris n'appelle PAS la création et dit qui détient le compte existant", async () => {
    const { onCreated } = await rendre()

    soumettre('PEA')

    expect(await screen.findByText('Un compte « PEA » existe déjà')).toBeInTheDocument()
    expect(screen.getByText(/Il est détenu par Alice\. Le nom d'un compte est unique dans le foyer\./)).toBeInTheDocument()
    expect(api.createCompte).not.toHaveBeenCalled()
    expect(api.createHolding).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('un nom déjà pris avec un type d\'épargne ne crée pas non plus de ligne (createHolding réutiliserait silencieusement le compte)', async () => {
    await rendre()
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'REGULATED_SAVINGS' } })

    soumettre('PEA')

    await screen.findByText('Un compte « PEA » existe déjà')
    expect(api.createHolding).not.toHaveBeenCalled()
  })

  it("« Ajouter Bob à ce compte » appelle onAjouterMembre avec le compte existant et l'identifiant de Bob", async () => {
    const existant = compte({ id: 9, membres_ids: [1] })
    vi.mocked(api.listComptes).mockResolvedValue([existant])
    const { onAjouterMembre } = await rendre()
    soumettre('PEA')

    // Alice est déjà sur le compte : Bob est le membre proposé.
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter Bob à ce compte' }))

    expect(onAjouterMembre).toHaveBeenCalledTimes(1)
    expect(onAjouterMembre).toHaveBeenCalledWith(existant, 2)
  })

  it('le membre sélectionné en haut de page (membreParDefaut) est celui proposé, même si un autre manque au compte', async () => {
    vi.mocked(api.listComptes).mockResolvedValue([compte({ membres_ids: [2] })])
    const { onAjouterMembre } = await rendre({ membreParDefaut: 1 })
    soumettre('PEA')

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter Alice à ce compte' }))

    expect(onAjouterMembre).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), 1)
    expect(screen.queryByRole('button', { name: 'Ajouter Bob à ce compte' })).not.toBeInTheDocument()
  })

  it('on peut choisir un autre membre dans « Pour quel membre ? » : boutons et nom proposé suivent', async () => {
    const { onAjouterMembre } = await rendre()
    soumettre('PEA')
    await screen.findByText('Un compte « PEA » existe déjà')

    fireEvent.change(screen.getByLabelText('Pour quel membre ?'), { target: { value: '1' } })

    expect(screen.getByRole('button', { name: 'Renommer en « PEA — Alice »' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter Alice à ce compte' }))
    expect(onAjouterMembre).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), 1)
  })

  it("« Renommer en « PEA — Bob » » pré-remplit le champ nom, ferme le panneau et n'écrit rien", async () => {
    await rendre()
    soumettre('PEA')

    fireEvent.click(await screen.findByRole('button', { name: 'Renommer en « PEA — Bob »' }))

    expect(screen.getByPlaceholderText('PEA, Livret A...')).toHaveValue('PEA — Bob')
    expect(screen.queryByText(/existe déjà/)).not.toBeInTheDocument()
    expect(api.createCompte).not.toHaveBeenCalled()
  })

  it('après « Renommer », valider crée le compte sous le nouveau nom', async () => {
    const { onCreated } = await rendre()
    soumettre('PEA')
    fireEvent.click(await screen.findByRole('button', { name: 'Renommer en « PEA — Bob »' }))

    fireEvent.click(screen.getByRole('button', { name: '+ Nouveau compte' }))

    await waitFor(() => expect(api.createCompte).toHaveBeenCalledWith('PEA — Bob', 7))
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
  })

  it("sans onAjouterMembre (assistant de bienvenue), pas de bouton d'ajout : seulement « Renommer »", async () => {
    await rendre({ onAjouterMembre: undefined })
    soumettre('PEA')

    await screen.findByText('Un compte « PEA » existe déjà')
    expect(screen.queryByRole('button', { name: /à ce compte/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renommer en « PEA — Bob »' })).toBeInTheDocument()
  })

  it("foyer d'un seul membre : pas de sélecteur « Pour quel membre ? », le bouton vise l'unique membre", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE])
    vi.mocked(api.listComptes).mockResolvedValue([compte({ membres_ids: [] })])
    const { onAjouterMembre } = await rendre()
    soumettre('PEA')

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter Alice à ce compte' }))

    expect(screen.queryByLabelText('Pour quel membre ?')).not.toBeInTheDocument()
    expect(onAjouterMembre).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), 1)
  })

  it("compte existant sans membre : le panneau le dit sans citer personne", async () => {
    vi.mocked(api.listComptes).mockResolvedValue([compte({ membres_ids: [] })])
    await rendre()

    soumettre('PEA')

    expect(await screen.findByText("Le nom d'un compte est unique dans le foyer.")).toBeInTheDocument()
    expect(screen.queryByText(/Il est détenu par/)).not.toBeInTheDocument()
  })

  it("foyer sans membre lisible : le panneau annonce le nom pris mais ne propose ni ajout ni renommage", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    await rendre()

    soumettre('PEA')

    expect(await screen.findByText('Un compte « PEA » existe déjà')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /à ce compte/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Renommer/ })).not.toBeInTheDocument()
  })

  it('cas de course : le serveur refuse la création, `listComptes` retrouve le compte => panneau homonyme, pas d\'erreur brute', async () => {
    // Premier contrôle avant écriture : rien ; le compte apparaît ensuite (créé ailleurs entre-temps).
    vi.mocked(api.listComptes).mockResolvedValueOnce([]).mockResolvedValue([compte({ nom: 'Livret B', id: 12, membres_ids: [1] })])
    vi.mocked(api.createCompte).mockRejectedValue(new Error('Ce nom est déjà pris'))
    await rendre()

    soumettre('Livret B')

    expect(await screen.findByText('Un compte « Livret B » existe déjà')).toBeInTheDocument()
    expect(screen.queryByText('Ce nom est déjà pris')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter Bob à ce compte' })).toBeInTheDocument()
  })
})
