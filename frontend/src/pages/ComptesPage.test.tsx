import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Compte, CompteAvecSolde, Detenteur, Etablissement, Holding } from '../api/types'
import ComptesPage from './ComptesPage'

vi.mock('../api/client', () => ({
  api: {
    listComptesAvecSolde: vi.fn(),
    listEtablissements: vi.fn(),
    getLogosEtablissements: vi.fn().mockResolvedValue({}),
    // Établissement requis à la création d'un compte (revue du 03/09/2026,
    // compte/établissement obligatoires) — `EtablissementsCard`, relocalisée sur
    // cet écran, et `AjoutCompteForm` (« + Nouvel établissement... ») en ont
    // désormais besoin.
    createEtablissement: vi.fn(),
    updateEtablissement: vi.fn(),
    deleteEtablissement: vi.fn(),
    createCompte: vi.fn(),
    deleteCompte: vi.fn(),
    // Fusion de l'écran Épargne (03/09/2026) : encart totaux (nécessite
    // `listHoldings`) et création d'une ligne d'épargne via `AjoutCompteForm`
    // (`createHolding`, quand un type est choisi).
    listHoldings: vi.fn().mockResolvedValue([]),
    createHolding: vi.fn(),
    // Membres du foyer et répartition (§ BN.1, lot 3) : neutres par défaut (`beforeEach`), surchargés
    // par les tests de la vue d'un membre et du badge « Non réparti ».
    listDetenteurs: vi.fn(),
    getLignesNonReparties: vi.fn(),
    getCompteQuotites: vi.fn(),
    setCompteQuotites: vi.fn(),
    listComptes: vi.fn(),
  },
}))

// Contrôles transverses (backlog 2.K.3) : `ComptesPage` lit
// `usePreferencesAffichage()` (montants masqués) — non testé ici, stub neutre.
// `detenteurId` (membre dont on voit la vue, § BN.1 lot 3) est pilotable : `null` = tout le foyer.
const preferences = vi.hoisted(() => ({ detenteurId: null as number | null }))
vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({
    lentille: 'net',
    setLentille: vi.fn(),
    montantsMasques: false,
    toggleMontantsMasques: vi.fn(),
    detenteurId: preferences.detenteurId,
    setDetenteurId: vi.fn(),
  }),
}))

// La fiche détaillée (modale) n'est pas l'objet de ce fichier : mise de côté pour ne
// vérifier que son ouverture (clic sur un compte), même patron que
// `PortefeuillePage.test.tsx`/`HoldingDetailModal`.
vi.mock('../components/CompteDetailModal', () => ({
  default: ({ compteId }: { compteId: number }) => <div data-testid="modale-detail">{compteId}</div>,
}))

function membre(id: number, nom: string): Detenteur {
  return { id, nom, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' }
}

function etablissement(overrides: Partial<Etablissement> = {}): Etablissement {
  return { id: 1, nom: 'Banque Test', logo_key: null, a_un_logo: false, logo_source: null, logo_maj_le: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00', ...overrides }
}

function compte(overrides: Partial<Compte> = {}): Compte {
  return {
    id: 1,
    nom: 'PEA',
    etablissement: null,
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    ...overrides,
  }
}

function ligne(overrides: Partial<CompteAvecSolde> = {}): CompteAvecSolde {
  return {
    compte: compte(),
    solde: 1000,
    nombre_lignes: 2,
    repartition_incomplete: false,
    repartition_non_renseignee: false,
    membres_ids: [],
    derniere_maj: null,
    ...overrides,
  }
}

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 1,
    ticker: 'AV1',
    nom: 'Assurance-vie Boursorama',
    quantite: 1,
    prix_revient_moyen: null,
    cout_acquisition_total: null,
    compte: null,
    type_actif: 'LIFE_INSURANCE',
    origine: 'manuel',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    market_data: null,
    rendement_depuis_achat_pct: null,
    rendement_annualise_pct: null,
    valeur: 10000,
    valeur_estimee: 10000,
    date_valeur_estimee: '2026-01-01T00:00:00',
    taux_pct: null,
    zone_geo: null,
    secteur: null,
    versement_mensuel: 200,
    date_acquisition: null,
    ...overrides,
  }
}

describe('ComptesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    preferences.detenteurId = null
    vi.mocked(api.listEtablissements).mockResolvedValue([])
    vi.mocked(api.listHoldings).mockResolvedValue([])
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 0, prets: 0 })
    vi.mocked(api.listComptes).mockResolvedValue([])
  })

  it("affiche un état vide quand aucun compte n'est déclaré", async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([])
    render(<ComptesPage />)

    await screen.findByText('Aucun compte déclaré.')
  })

  it('groupe les comptes par établissement, avec un total du foyer en tête', async () => {
    const banque = etablissement({ id: 1, nom: 'Banque Test' })
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 1, nom: 'PEA', etablissement: banque }), solde: 1000 }),
      ligne({ compte: compte({ id: 2, nom: 'Livret A', etablissement: null }), solde: 500, nombre_lignes: 1 }),
    ])
    render(<ComptesPage />)

    await screen.findByText('Banque Test')
    expect(screen.getByText('PEA')).toBeInTheDocument()
    expect(screen.getByText('Sans établissement')).toBeInTheDocument()
    expect(screen.getByText('Livret A')).toBeInTheDocument()
    // Total du foyer (1000 + 500), affiché en tête d'écran.
    expect(screen.getByText('1 500 €')).toBeInTheDocument()
  })

  // Retour utilisateur du 09/09/2026 : signaler une répartition entre détenteurs
  // non complétée (commencée puis rompue, le plus souvent par la suppression d'un
  // détenteur) directement sur la vue des comptes.
  it('affiche un triangle d\'avertissement sur un compte dont la répartition est incomplète', async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 1, nom: 'PEA' }), repartition_incomplete: true }),
      ligne({ compte: compte({ id: 2, nom: 'Livret A' }), repartition_incomplete: false }),
    ])
    render(<ComptesPage />)

    await screen.findByText('PEA')
    expect(screen.getByRole('img', { name: /répartition.*incomplète/i })).toBeInTheDocument()
  })

  // Retour utilisateur du 20/09/2026 : inviter à renseigner une répartition jamais commencée — état
  // valide, pas une erreur. Depuis le lot 3 (§ BN.1), l'icône neutre a laissé place au badge
  // « Non réparti » (avec son lien « Répartir »), qui n'a de sens que si le foyer a des membres.
  it('signale par un badge « Non réparti » le seul compte dont la répartition est non renseignée', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([membre(1, 'Alice')])
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 1, nom: 'PEA' }), repartition_non_renseignee: true }),
      ligne({ compte: compte({ id: 2, nom: 'Livret A' }), repartition_non_renseignee: false }),
    ])
    render(<ComptesPage />)

    await screen.findByText('PEA')
    expect(await screen.findAllByText('Non réparti')).toHaveLength(1)
  })

  it("n'affiche aucun badge « Non réparti » tant que le foyer n'a aucun membre", async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 1, nom: 'PEA' }), repartition_non_renseignee: true }),
    ])
    render(<ComptesPage />)

    await screen.findByText('PEA')
    await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    expect(screen.queryByText('Non réparti')).not.toBeInTheDocument()
  })

  // Demande directe du 16/09/2026 : dernière activité utilisateur affichée par
  // compte, absente quand elle n'a pas de sens (bucket « Sans compte »).
  it('affiche la date de dernière mise à jour quand elle est connue', async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 1, nom: 'PEA' }), derniere_maj: '2026-09-10T14:32:00' }),
    ])
    render(<ComptesPage />)

    await screen.findByText('PEA')
    expect(screen.getByText(/mise à jour le 10\/09\/2026/)).toBeInTheDocument()
  })

  it("n'affiche aucune date de mise à jour pour le bucket \"Sans compte\"", async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([ligne({ compte: null, derniere_maj: null })])
    render(<ComptesPage />)

    await screen.findByText('Sans compte')
    expect(screen.queryByText(/mise à jour le/)).not.toBeInTheDocument()
  })

  it('le bucket "Sans compte" (compte === null) est affiché mais non cliquable', async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([ligne({ compte: null, solde: 250, nombre_lignes: 3 })])
    render(<ComptesPage />)

    await screen.findByText('Sans compte')
    expect(screen.queryByRole('button', { name: /Sans compte/ })).not.toBeInTheDocument()
  })

  it('créer un compte appelle createCompte puis recharge la liste', async () => {
    const etablissement: Etablissement = { id: 7, nom: 'Boursorama', logo_key: null, a_un_logo: false, logo_source: null, logo_maj_le: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' }
    vi.mocked(api.listComptesAvecSolde).mockResolvedValueOnce([]).mockResolvedValue([ligne({ compte: compte({ nom: 'Nouveau CTO' }) })])
    // Établissement obligatoire à la création (revue du 03/09/2026) — existant ici
    // (contrairement à `EpargnePage.test.tsx`), choisi directement dans la liste.
    vi.mocked(api.listEtablissements).mockResolvedValue([etablissement])
    vi.mocked(api.createCompte).mockResolvedValue(compte({ nom: 'Nouveau CTO', etablissement }))
    render(<ComptesPage />)
    await screen.findByText('Aucun compte déclaré.')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un compte' }))
    fireEvent.change(screen.getByPlaceholderText('PEA, Livret A...'), { target: { value: 'Nouveau CTO' } })
    fireEvent.change(screen.getByLabelText('Établissement'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Nouveau compte' }))

    await screen.findByText('Nouveau CTO')
    expect(api.createCompte).toHaveBeenCalledWith('Nouveau CTO', 7)
  })

  it('cliquer un compte ouvre la fiche détaillée (modale)', async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([ligne({ compte: compte({ id: 42, nom: 'PEA' }) })])
    render(<ComptesPage />)
    await screen.findByText('PEA')

    fireEvent.click(screen.getByText('PEA'))

    const modale = await screen.findByTestId('modale-detail')
    expect(modale).toHaveTextContent('42')
  })

  // La suppression a quitté cette liste (recommandation explicite du paquet de
  // design) : un lien rouge à côté du solde, sur une ligne elle-même cliquable, est
  // trop facile à toucher par erreur. Elle vit au fond de la fiche du compte —
  // couverte par `CompteDetailContent.test.tsx`. Ce test verrouille son ABSENCE ici.
  it("n'expose plus de suppression directe sur la ligne d'un compte", async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([ligne({ compte: compte({ id: 42, nom: 'PEA' }) })])
    render(<ComptesPage />)
    await screen.findByText('PEA')

    expect(screen.queryByRole('button', { name: /Supprimer/ })).not.toBeInTheDocument()
  })

  describe('encart Épargne (fusion du 03/09/2026)', () => {
    it("n'affiche pas l'encart quand aucune ligne d'épargne n'existe", async () => {
      vi.mocked(api.listComptesAvecSolde).mockResolvedValue([])
      vi.mocked(api.listHoldings).mockResolvedValue([holding({ type_actif: 'STOCK' })])
      render(<ComptesPage />)

      await screen.findByText('Aucun compte déclaré.')
      expect(screen.queryByText('Valeur épargne totale')).not.toBeInTheDocument()
    })

    it('additionne la valeur et le versement mensuel des lignes épargne uniquement', async () => {
      vi.mocked(api.listComptesAvecSolde).mockResolvedValue([])
      vi.mocked(api.listHoldings).mockResolvedValue([
        holding({ id: 1, ticker: 'AV1', type_actif: 'LIFE_INSURANCE', valeur_estimee: 10000, versement_mensuel: 200 }),
        holding({ id: 2, ticker: 'PER1', type_actif: 'PENSION', valeur_estimee: 5000, versement_mensuel: 100 }),
        // Ni valeur ni versement de cette ligne financière ne doivent compter.
        holding({ id: 3, ticker: 'AAPL', type_actif: 'STOCK', valeur_estimee: null, versement_mensuel: null }),
      ])
      render(<ComptesPage />)

      await screen.findByText('Valeur épargne totale')
      expect(screen.getByText('15 000,00 €')).toBeInTheDocument()
      expect(screen.getByText('300,00 €')).toBeInTheDocument()
    })
  })

  describe('créer une ligne d\'épargne depuis "Nouveau compte" (fusion du 03/09/2026)', () => {
    it('un type choisi appelle createHolding (compte 1:1 créé au passage), pas createCompte', async () => {
      const banque = etablissement({ id: 7, nom: 'Boursorama' })
      vi.mocked(api.listComptesAvecSolde).mockResolvedValueOnce([]).mockResolvedValue([ligne({ compte: compte({ nom: 'Livret A' }) })])
      vi.mocked(api.listEtablissements).mockResolvedValue([banque])
      vi.mocked(api.createHolding).mockResolvedValue(holding({ nom: 'Livret A' }))
      render(<ComptesPage />)
      await screen.findByText('Aucun compte déclaré.')

      fireEvent.click(screen.getByRole('button', { name: 'Ajouter un compte' }))
      fireEvent.change(screen.getByPlaceholderText('PEA, Livret A...'), { target: { value: 'Livret A' } })
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'REGULATED_SAVINGS' } })
      fireEvent.change(screen.getByLabelText('Valeur initiale (€, optionnel)'), { target: { value: '5000' } })
      fireEvent.change(screen.getByLabelText('Établissement'), { target: { value: '7' } })
      fireEvent.click(screen.getByRole('button', { name: '+ Nouveau compte' }))

      await vi.waitFor(() =>
        expect(api.createHolding).toHaveBeenCalledWith(
          expect.objectContaining({
            nom: 'Livret A',
            type_actif: 'REGULATED_SAVINGS',
            valeur_estimee: 5000,
            quantite: 1,
            compte_nom: 'Livret A',
            etablissement_id: 7,
          }),
        ),
      )
      expect(api.createCompte).not.toHaveBeenCalled()
    })

    it('aucun type choisi (compte vide) appelle createCompte, comme avant la fusion', async () => {
      const banque = etablissement({ id: 7, nom: 'Boursorama' })
      vi.mocked(api.listComptesAvecSolde).mockResolvedValueOnce([]).mockResolvedValue([ligne({ compte: compte({ nom: 'CTO' }) })])
      vi.mocked(api.listEtablissements).mockResolvedValue([banque])
      vi.mocked(api.createCompte).mockResolvedValue(compte({ nom: 'CTO', etablissement: banque }))
      render(<ComptesPage />)
      await screen.findByText('Aucun compte déclaré.')

      fireEvent.click(screen.getByRole('button', { name: 'Ajouter un compte' }))
      fireEvent.change(screen.getByPlaceholderText('PEA, Livret A...'), { target: { value: 'CTO' } })
      fireEvent.change(screen.getByLabelText('Établissement'), { target: { value: '7' } })
      fireEvent.click(screen.getByRole('button', { name: '+ Nouveau compte' }))

      await vi.waitFor(() => expect(api.createCompte).toHaveBeenCalledWith('CTO', 7))
      expect(api.createHolding).not.toHaveBeenCalled()
    })
  })
})

// Répartition entre les membres du foyer (§ BN.1, lot 3) : vue d'un membre, noms à côté des comptes,
// badge « Non réparti » qui ouvre la répartition du compte, totaux d'épargne au prorata.
describe('ComptesPage — membres du foyer (§ BN.1, lot 3)', () => {
  /** Les formats français séparent milliers et unité par des espaces insécables : on les normalise. */
  const normaliser = (texte: string | null) => (texte ?? '').replace(/[  ]/g, ' ')

  beforeEach(() => {
    vi.clearAllMocks()
    preferences.detenteurId = null
    vi.mocked(api.listEtablissements).mockResolvedValue([])
    vi.mocked(api.listHoldings).mockResolvedValue([])
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 0, prets: 0 })
    vi.mocked(api.listComptes).mockResolvedValue([])
    vi.mocked(api.listDetenteurs).mockResolvedValue([membre(1, 'Alice'), membre(2, 'Bob')])
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([ligne({ compte: compte({ id: 1, nom: 'PEA' }) })])
  })

  it('sans membre sélectionné, soldes et actifs sont demandés pour tout le foyer (null)', async () => {
    render(<ComptesPage />)

    await screen.findByText('PEA')
    expect(api.listComptesAvecSolde).toHaveBeenCalledWith(null)
    expect(api.listHoldings).toHaveBeenCalledWith(null)
    expect(screen.queryByText(/Vue de/)).not.toBeInTheDocument()
  })

  it('avec un membre sélectionné, soldes et actifs sont demandés pour LUI (1) et le bandeau dit « Vue de Alice »', async () => {
    preferences.detenteurId = 1
    render(<ComptesPage />)

    await screen.findByText('PEA')
    expect(api.listComptesAvecSolde).toHaveBeenCalledWith(1)
    expect(api.listHoldings).toHaveBeenCalledWith(1)
    expect(await screen.findByText(/Vue de Alice : les valeurs sont au prorata de ses parts\./)).toBeInTheDocument()
  })

  it("le total en tête est la somme des soldes renvoyés (déjà au prorata côté serveur dans la vue d'un membre)", async () => {
    preferences.detenteurId = 1
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 1, nom: 'PEA' }), solde: 1500 }),
      ligne({ compte: compte({ id: 2, nom: 'Livret A' }), solde: 500 }),
    ])
    render(<ComptesPage />)

    await screen.findByText('PEA')
    expect(screen.getAllByText((_, el) => el?.tagName === 'SPAN' && normaliser(el.textContent) === '2 000 €')).not.toHaveLength(0)
  })

  it('à partir de deux membres, les noms des membres du compte se lisent à côté du compte', async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 1, nom: 'PEA' }), membres_ids: [1, 2] }),
      ligne({ compte: compte({ id: 2, nom: 'Livret A' }), membres_ids: [2] }),
    ])
    render(<ComptesPage />)

    await screen.findByText('PEA')
    expect(await screen.findByText('· Alice, Bob')).toBeInTheDocument()
    expect(screen.getByText('· Bob')).toBeInTheDocument()
  })

  it('avec un seul membre dans le foyer, les noms ne sont pas répétés à côté des comptes', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([membre(1, 'Alice')])
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([ligne({ compte: compte({ id: 1, nom: 'PEA' }), membres_ids: [1] })])
    render(<ComptesPage />)

    await screen.findByText('PEA')
    await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    expect(screen.queryByText('· Alice')).not.toBeInTheDocument()
  })

  it("le badge « Non réparti » ouvre la répartition du compte, qui s'enregistre via setCompteQuotites puis recharge", async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 3, nom: 'PEA' }), repartition_non_renseignee: true }),
    ])
    vi.mocked(api.getCompteQuotites).mockResolvedValue({ quotites: [], uniforme: true } as never)
    vi.mocked(api.setCompteQuotites).mockResolvedValue({ ok: true } as never)
    render(<ComptesPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Répartir « PEA » entre les membres du foyer' }))

    expect(await screen.findByRole('heading', { name: 'Répartir « PEA »' })).toBeInTheDocument()
    expect(api.getCompteQuotites).toHaveBeenCalledWith(3)
    expect(api.setCompteQuotites).not.toHaveBeenCalled()
    const nbChargements = vi.mocked(api.listComptesAvecSolde).mock.calls.length
    fireEvent.change(await screen.findByLabelText('Part de Alice (%)'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la répartition' }))

    await waitFor(() =>
      expect(api.setCompteQuotites).toHaveBeenCalledWith(3, [
        { detenteur_id: 1, quotite_pct: 30 },
        { detenteur_id: 2, quotite_pct: 70 },
      ]),
    )
    await waitFor(() => expect(vi.mocked(api.listComptesAvecSolde).mock.calls.length).toBeGreaterThan(nbChargements))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Répartir « PEA »' })).not.toBeInTheDocument())
  })

  it("cliquer « Répartir » n'ouvre pas la fiche du compte", async () => {
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([
      ligne({ compte: compte({ id: 3, nom: 'PEA' }), repartition_non_renseignee: true }),
    ])
    vi.mocked(api.getCompteQuotites).mockResolvedValue({ quotites: [], uniforme: true } as never)
    render(<ComptesPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Répartir « PEA »/ }))

    await screen.findByRole('heading', { name: 'Répartir « PEA »' })
    expect(screen.queryByTestId('modale-detail')).not.toBeInTheDocument()
  })

  it("les totaux d'épargne (valeur et versement mensuel) sont proratisés par la part du membre", async () => {
    preferences.detenteurId = 1
    vi.mocked(api.listHoldings).mockResolvedValue([
      holding({ id: 1, valeur_estimee: 10000, versement_mensuel: 200, quotite_pct: 50, valeur_ligne: 10000 }),
    ])
    render(<ComptesPage />)

    // 50 % de 10 000 € = 5 000 € ; 50 % de 200 € = 100 € par mois.
    await screen.findByText('Valeur épargne totale')
    expect(screen.getByText((_, el) => el?.tagName === 'P' && normaliser(el.textContent) === '5 000,00 €')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.tagName === 'P' && normaliser(el.textContent) === '100,00 €')).toBeInTheDocument()
  })

  it("hors vue d'un membre, les totaux d'épargne restent entiers (aucune quotite_pct)", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ id: 1, valeur_estimee: 10000, versement_mensuel: 200 })])
    render(<ComptesPage />)

    await screen.findByText('Valeur épargne totale')
    expect(screen.getByText((_, el) => el?.tagName === 'P' && normaliser(el.textContent) === '10 000,00 €')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.tagName === 'P' && normaliser(el.textContent) === '200,00 €')).toBeInTheDocument()
  })

  it('nom de compte déjà pris : « Ajouter Bob à ce compte » ferme la feuille et ouvre la répartition du compte existant, Bob à parts égales', async () => {
    const banque = etablissement({ id: 7, nom: 'Boursorama' })
    const existant = compte({ id: 9, nom: 'PEA', membres_ids: [1] })
    vi.mocked(api.listEtablissements).mockResolvedValue([banque])
    vi.mocked(api.listComptes).mockResolvedValue([existant])
    vi.mocked(api.listComptesAvecSolde).mockResolvedValue([ligne({ compte: existant, membres_ids: [1] })])
    vi.mocked(api.getCompteQuotites).mockResolvedValue({ quotites: [{ detenteur_id: 1, quotite_pct: 100 }], uniforme: true } as never)
    render(<ComptesPage />)
    await screen.findByText('PEA')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un compte' }))
    // Le temps que le formulaire ait lu les membres du foyer (un utilisateur ne saisit pas en quelques millisecondes).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    fireEvent.change(screen.getByPlaceholderText('PEA, Livret A...'), { target: { value: 'PEA' } })
    fireEvent.change(screen.getByLabelText('Établissement'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Nouveau compte' }))
    // Aucun membre sélectionné : Bob est le premier qui n'est pas déjà sur le compte.
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter Bob à ce compte' }))

    expect(await screen.findByRole('heading', { name: 'Répartir « PEA »' })).toBeInTheDocument()
    expect(screen.getByText('Bob est ajouté à ce compte : ajustez les parts puis enregistrez.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(50))
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(50)
    expect(api.createCompte).not.toHaveBeenCalled()
    expect(api.setCompteQuotites).not.toHaveBeenCalled()
  })
})
