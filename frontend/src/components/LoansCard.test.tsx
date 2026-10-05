import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Holding, Loan } from '../api/types'
import { simulerLargeurEcran } from '../test/matchMedia'
import LoansCard from './LoansCard'

vi.mock('../api/client', () => ({
  api: {
    listLoans: vi.fn(),
    createLoan: vi.fn(),
    updateLoan: vi.fn(),
    deleteLoan: vi.fn(),
    // Rattachement à un actif (backlog 2.M.2) — non testé ici, résolution neutre.
    listHoldings: vi.fn().mockResolvedValue([]),
    // Établissement du crédit (revue du 03/09/2026) — non testé ici sauf section
    // dédiée plus bas, résolution neutre par défaut.
    listEtablissements: vi.fn().mockResolvedValue([]),
    // Répartition d'un prêt entre membres (§ BN.1, lot 2) — section dédiée plus bas.
    listDetenteurs: vi.fn().mockResolvedValue([]),
    getLoanQuotites: vi.fn(),
    setLoanQuotites: vi.fn(),
  },
}))

// Contrôles transverses (backlog 2.K.3) : `LoansCard` lit `usePreferencesAffichage()`
// (montants masqués) — non testé ici, stub neutre.
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

beforeEach(() => {
  preferences.detenteurId = null
})

function loan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 1,
    libelle: 'Crédit immobilier',
    capital_initial: 200000,
    taux_annuel_pct: 3.5,
    mensualite: 1200,
    date_debut: '2020-01-01T00:00:00',
    duree_mois: 240,
    capital_restant_du_manuel: null,
    derniere_maj_manuelle: null,
    capital_restant_du: 150000,
    holding_id: null,
    etablissement_id: null,
    created_at: '2020-01-01T00:00:00',
    updated_at: '2020-01-01T00:00:00',
    ...overrides,
  }
}

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 1,
    ticker: 'MAISON',
    nom: 'Maison',
    quantite: 1,
    prix_revient_moyen: 200000,
    cout_acquisition_total: 200000,
    compte: null,
    type_actif: 'REAL_ESTATE',
    origine: 'manuel',
    created_at: '2020-01-01T00:00:00',
    updated_at: '2020-01-01T00:00:00',
    market_data: null,
    rendement_depuis_achat_pct: null,
    rendement_annualise_pct: null,
    valeur: 300000,
    valeur_estimee: 300000,
    date_valeur_estimee: null,
    taux_pct: null,
    zone_geo: null,
    secteur: null,
    versement_mensuel: null,
    date_acquisition: null,
    ...overrides,
  }
}

describe('LoansCard', () => {
  it('affiche un message quand aucun emprunt n\'est enregistré, avec une invitation à en ajouter un', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([])
    render(<LoansCard />)

    await screen.findByText('Aucun emprunt enregistré.')
    expect(screen.getByText(/Renseigne un crédit immobilier/)).toBeInTheDocument()
  })

  it('Réessayer relance listLoans après un échec (backlog 2.K.5)', async () => {
    vi.mocked(api.listLoans).mockRejectedValueOnce(new Error('panne simulée'))
    render(<LoansCard />)
    await screen.findByText('panne simulée')

    vi.mocked(api.listLoans).mockResolvedValueOnce([loan()])
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    await screen.findByText('Crédit immobilier')
  })

  it('liste les emprunts avec leur capital restant dû', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    // "150 000 €" apparaît deux fois avec un seul emprunt (la ligne ET le total du
    // tableau, qui vaut la même somme) — on vérifie juste sa présence, pas l'unicité.
    expect(screen.getAllByText('150 000 €').length).toBeGreaterThan(0)
  })

  it("l'en-tête « Capital restant dû » porte une infobulle explicative (backlog § AZ.3, vue tableau)", async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    // `InfoBulle` reste `aria-hidden`, sans texte propre : le nom accessible de
    // l'en-tête doit continuer à matcher exactement "Capital restant dû".
    const entete = screen.getByRole('columnheader', { name: 'Capital restant dû' })
    expect(entete.querySelector('[title]')).toHaveAttribute(
      'title',
      "Ce qu'il reste à rembourser sur cet emprunt aujourd'hui — diminue à chaque mensualité, jusqu'à zéro en fin de prêt.",
    )
  })

  it("le libellé « Capital restant dû » porte une infobulle explicative (backlog § AZ.3, vue mobile)", async () => {
    simulerLargeurEcran(true)
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    expect(screen.getByText('Capital restant dû').closest('span')?.querySelector('[title]')).toHaveAttribute(
      'title',
      "Ce qu'il reste à rembourser sur cet emprunt aujourd'hui — diminue à chaque mensualité, jusqu'à zéro en fin de prêt.",
    )
  })

  // L'ajout d'un emprunt vit désormais dans `AjoutHoldingForm` (mode « Un emprunt »,
  // 09/09/2026) — testé là-bas (`PortefeuillePage.test.tsx`). Cette carte n'a plus
  // qu'à savoir se recharger quand `reloadToken` change, sa seule interface avec ce
  // nouveau point d'entrée externe.
  it('se recharge quand `reloadToken` change (nouvel emprunt créé ailleurs)', async () => {
    vi.mocked(api.listLoans).mockResolvedValueOnce([]).mockResolvedValueOnce([loan()])
    const { rerender } = render(<LoansCard reloadToken={0} />)

    await screen.findByText('Aucun emprunt enregistré.')
    const appelsAvant = vi.mocked(api.listLoans).mock.calls.length

    rerender(<LoansCard reloadToken={1} />)

    await screen.findByText('Crédit immobilier')
    expect(vi.mocked(api.listLoans).mock.calls.length).toBe(appelsAvant + 1)
  })

  it('le recalage manuel appelle updateLoan avec capital_restant_du_manuel', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    vi.mocked(api.updateLoan).mockResolvedValue(loan({ capital_restant_du: 100000, capital_restant_du_manuel: 100000 }))
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    fireEvent.click(screen.getByRole('button', { name: 'Recaler' }))

    const input = screen.getByLabelText('Recaler le capital restant dû de Crédit immobilier')
    fireEvent.change(input, { target: { value: '100000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await vi.waitFor(() => expect(api.updateLoan).toHaveBeenCalledWith(1, { capital_restant_du_manuel: 100000 }))
  })

  it('la suppression demande confirmation avant d\'appeler deleteLoan', async () => {
    vi.mocked(api.listLoans).mockResolvedValueOnce([loan()]).mockResolvedValueOnce([])
    vi.mocked(api.deleteLoan).mockResolvedValue({ ok: true })
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    const dialogue = screen.getByRole('dialog')
    expect(api.deleteLoan).not.toHaveBeenCalled()
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Supprimer' }))

    await vi.waitFor(() => expect(api.deleteLoan).toHaveBeenCalledWith(1))
  })
})

describe('LoansCard — édition complète (backlog quickwin § T.1)', () => {
  it('Modifier pré-remplit le formulaire avec les valeurs actuelles', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))

    expect(screen.getByLabelText('Libellé de Crédit immobilier (édition)')).toHaveValue('Crédit immobilier')
    expect(screen.getByLabelText('Capital initial de Crédit immobilier (édition)')).toHaveValue(200000)
    expect(screen.getByLabelText('Taux annuel de Crédit immobilier (édition)')).toHaveValue(3.5)
    expect(screen.getByLabelText('Mensualité de Crédit immobilier (édition)')).toHaveValue(1200)
    expect(screen.getByLabelText('Date de début de Crédit immobilier (édition)')).toHaveValue('2020-01-01')
    expect(screen.getByLabelText('Durée de Crédit immobilier (édition)')).toHaveValue(240)
  })

  it("l'enregistrement appelle updateLoan avec les champs modifiés, jamais capital_restant_du_manuel", async () => {
    vi.mocked(api.listLoans).mockResolvedValueOnce([loan()]).mockResolvedValueOnce([loan({ libelle: 'Crédit renégocié', taux_annuel_pct: 2.1 })])
    vi.mocked(api.updateLoan).mockResolvedValue(loan({ libelle: 'Crédit renégocié', taux_annuel_pct: 2.1 }))
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))

    fireEvent.change(screen.getByLabelText('Libellé de Crédit immobilier (édition)'), { target: { value: 'Crédit renégocié' } })
    fireEvent.change(screen.getByLabelText('Taux annuel de Crédit immobilier (édition)'), { target: { value: '2.1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await vi.waitFor(() =>
      expect(api.updateLoan).toHaveBeenCalledWith(1, {
        libelle: 'Crédit renégocié',
        capital_initial: 200000,
        taux_annuel_pct: 2.1,
        mensualite: 1200,
        date_debut: '2020-01-01',
        duree_mois: 240,
      }),
    )
    await screen.findByText('Crédit renégocié')
  })

  it('Annuler ferme le formulaire sans appeler updateLoan', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    vi.mocked(api.updateLoan).mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(api.updateLoan).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Libellé de Crédit immobilier (édition)')).not.toBeInTheDocument()
  })

  it('un libellé vidé bloque la sauvegarde côté client', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    fireEvent.change(screen.getByLabelText('Libellé de Crédit immobilier (édition)'), { target: { value: '  ' } })
    vi.mocked(api.updateLoan).mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(api.updateLoan).not.toHaveBeenCalled()
  })

  it("l'édition fonctionne aussi dans la vue carte (mobile)", async () => {
    simulerLargeurEcran(true)
    vi.mocked(api.listLoans).mockResolvedValueOnce([loan()]).mockResolvedValueOnce([loan({ mensualite: 1500 })])
    vi.mocked(api.updateLoan).mockResolvedValue(loan({ mensualite: 1500 }))
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    fireEvent.change(screen.getByLabelText('Mensualité de Crédit immobilier (édition)'), { target: { value: '1500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await vi.waitFor(() =>
      expect(api.updateLoan).toHaveBeenCalledWith(1, {
        libelle: 'Crédit immobilier',
        capital_initial: 200000,
        taux_annuel_pct: 3.5,
        mensualite: 1500,
        date_debut: '2020-01-01',
        duree_mois: 240,
      }),
    )
  })
})

describe('LoansCard — rattachement à un actif (backlog 2.M.2)', () => {
  it('propose "Aucun" + chaque actif du portefeuille dans le sélecteur de rattachement', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ id: 1, nom: 'Maison' }), holding({ id: 2, ticker: 'AAPL', nom: 'Apple' })])
    render(<LoansCard />)
    await screen.findByText('Crédit immobilier')

    const select = await screen.findByLabelText('Actif rattaché à Crédit immobilier')
    expect(within(select).getByRole('option', { name: 'Maison' })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: 'Apple' })).toBeInTheDocument()
  })

  it('choisir un actif appelle updateLoan avec holding_id puis recharge la liste', async () => {
    vi.mocked(api.listLoans).mockResolvedValueOnce([loan()]).mockResolvedValueOnce([loan({ holding_id: 1 })])
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ id: 1, nom: 'Maison' })])
    vi.mocked(api.updateLoan).mockResolvedValue(loan({ holding_id: 1 }))
    render(<LoansCard />)
    await screen.findByText('Crédit immobilier')
    const select = await screen.findByLabelText('Actif rattaché à Crédit immobilier')

    fireEvent.change(select, { target: { value: '1' } })

    await vi.waitFor(() => expect(api.updateLoan).toHaveBeenCalledWith(1, { holding_id: 1 }))
  })

  it('un emprunt déjà rattaché affiche le bon actif présélectionné', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan({ holding_id: 2 })])
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ id: 1, nom: 'Maison' }), holding({ id: 2, ticker: 'AAPL', nom: 'Apple' })])
    render(<LoansCard />)

    await screen.findByDisplayValue('Apple')
  })
})

describe('LoansCard — cartes sur mobile (backlog 2.K.4)', () => {
  it('affiche une carte par emprunt (pas de tableau) avec ses informations clés', async () => {
    simulerLargeurEcran(true)
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    render(<LoansCard />)

    await screen.findByText('Crédit immobilier')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('3,50 %')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recaler' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument()
  })

  it('le recalage manuel fonctionne aussi dans la vue carte', async () => {
    simulerLargeurEcran(true)
    vi.mocked(api.listLoans).mockResolvedValue([loan()])
    vi.mocked(api.updateLoan).mockResolvedValue(loan({ capital_restant_du: 100000, capital_restant_du_manuel: 100000 }))
    render(<LoansCard />)
    await screen.findByText('Crédit immobilier')

    fireEvent.click(screen.getByRole('button', { name: 'Recaler' }))
    const input = screen.getByLabelText('Recaler le capital restant dû de Crédit immobilier')
    fireEvent.change(input, { target: { value: '100000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await vi.waitFor(() => expect(api.updateLoan).toHaveBeenCalledWith(1, { capital_restant_du_manuel: 100000 }))
  })

  it('le rattachement à un actif fonctionne aussi dans la vue carte', async () => {
    simulerLargeurEcran(true)
    vi.mocked(api.listLoans).mockResolvedValueOnce([loan()]).mockResolvedValueOnce([loan({ holding_id: 1 })])
    vi.mocked(api.listHoldings).mockResolvedValue([holding({ id: 1, nom: 'Maison' })])
    vi.mocked(api.updateLoan).mockResolvedValue(loan({ holding_id: 1 }))
    render(<LoansCard />)
    await screen.findByText('Crédit immobilier')

    fireEvent.change(screen.getByLabelText('Actif rattaché'), { target: { value: '1' } })

    await vi.waitFor(() => expect(api.updateLoan).toHaveBeenCalledWith(1, { holding_id: 1 }))
  })
  describe('positions fournies par la page (backlog Z.1)', () => {
    // Ce fichier ne remet pas les mocks à zéro entre les tests : sans ce nettoyage,
    // on compterait les appels des tests précédents.
    beforeEach(() => {
      vi.mocked(api.listHoldings).mockClear()
      vi.mocked(api.listHoldings).mockResolvedValue([])
    })

    it("ne redemande pas les positions quand la page les fournit", async () => {
      // `PortefeuillePage` charge déjà `GET /portfolio/holdings` pour son tableau,
      // et montait cette carte qui les redemandait — la plus lourde des requêtes
      // dupliquées identifiées.
      vi.mocked(api.listLoans).mockResolvedValue([])

      render(<LoansCard holdings={[]} />)
      await vi.waitFor(() => expect(vi.mocked(api.listLoans)).toHaveBeenCalled())

      expect(vi.mocked(api.listHoldings)).not.toHaveBeenCalled()
    })

    it("les charge elle-même quand aucune liste ne lui est fournie", async () => {
      // L'autre moitié du contrat : la carte reste utilisable seule. Sans ce test,
      // on pourrait rendre la prop obligatoire sans s'en apercevoir.
      vi.mocked(api.listLoans).mockResolvedValue([])

      render(<LoansCard />)

      await vi.waitFor(() => expect(vi.mocked(api.listHoldings)).toHaveBeenCalledTimes(1))
    })
  })
})

describe('LoansCard — répartition du prêt entre membres (§ BN.1, lot 2)', () => {
  const HORODATAGE = '2026-01-01T00:00:00'
  const ALICE = { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE }
  const BOB = { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE }

  beforeEach(() => {
    simulerLargeurEcran(false)
    vi.mocked(api.listLoans).mockResolvedValue([loan({ id: 4 })])
    vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE, BOB])
    vi.mocked(api.setLoanQuotites).mockClear()
  })

  async function ouvrirDetenteurs() {
    fireEvent.click(await screen.findByRole('button', { name: 'Membres du foyer' }))
  }

  it("s'ouvre sur la répartition ACTUELLE du prêt, pas sur un formulaire vide", async () => {
    vi.mocked(api.getLoanQuotites).mockResolvedValue({
      quotites: [
        { detenteur_id: 1, quotite_pct: 70 },
        { detenteur_id: 2, quotite_pct: 30 },
      ],
      heritee: false,
    })
    render(<LoansCard />)
    await ouvrirDetenteurs()

    expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(70)
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(30)
    expect(api.getLoanQuotites).toHaveBeenCalledWith(4)
    expect(screen.getByRole('button', { name: 'Remplacer la répartition du prêt' })).toBeEnabled()
  })

  it("un prêt qui hérite de la répartition de son bien l'affiche, et le dit", async () => {
    vi.mocked(api.getLoanQuotites).mockResolvedValue({
      quotites: [
        { detenteur_id: 1, quotite_pct: 50 },
        { detenteur_id: 2, quotite_pct: 50 },
      ],
      heritee: true,
    })
    render(<LoansCard />)
    await ouvrirDetenteurs()

    expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(50)
    expect(screen.getByText(/Ce prêt suit la répartition du bien qu'il finance/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Donner sa propre répartition au prêt' })).toBeInTheDocument()
  })

  it("enregistrer envoie la répartition affichée et confirme", async () => {
    vi.mocked(api.getLoanQuotites).mockResolvedValue({ quotites: [], heritee: false })
    vi.mocked(api.setLoanQuotites).mockResolvedValue({ ok: true })
    render(<LoansCard />)
    await ouvrirDetenteurs()
    await screen.findByLabelText('Part de Alice (%)')

    // Rien d'enregistré : parts égales proposées, appliquées seulement au clic.
    expect(api.setLoanQuotites).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Remplacer la répartition du prêt' }))

    await vi.waitFor(() =>
      expect(api.setLoanQuotites).toHaveBeenCalledWith(4, [
        { detenteur_id: 1, quotite_pct: 50 },
        { detenteur_id: 2, quotite_pct: 50 },
      ]),
    )
    expect(await screen.findByText('Répartition enregistrée.')).toBeInTheDocument()
  })
})

describe("LoansCard — répartition globale et vue d'un membre (§ BN.1, lot 3)", () => {
  const HORODATAGE = '2026-01-01T00:00:00'
  const ALICE = { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE }
  const BOB = { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE }

  beforeEach(() => {
    simulerLargeurEcran(false)
    vi.mocked(api.listLoans).mockReset()
    vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE, BOB])
    vi.mocked(api.getLoanQuotites).mockReset()
    vi.mocked(api.setLoanQuotites).mockReset()
  })

  describe.each([
    { nom: 'tableau (desktop)', mobile: false },
    { nom: 'cartes (mobile)', mobile: true },
  ])('$nom', ({ mobile }) => {
    beforeEach(() => simulerLargeurEcran(mobile))

    it("badge « Non réparti » et lien « Répartir » sur un prêt sans répartition effective (repartie: false)", async () => {
      vi.mocked(api.listLoans).mockResolvedValue([loan({ id: 4, repartie: false }), loan({ id: 5, libelle: 'Prêt auto', repartie: true })])
      render(<LoansCard />)

      await screen.findByText('Prêt auto')
      expect(await screen.findAllByText('Non réparti')).toHaveLength(1)
      expect(screen.getByRole('button', { name: 'Répartir « Crédit immobilier » entre les membres du foyer' })).toBeInTheDocument()
    })

    it("« Répartir » ouvre l'éditeur de répartition du prêt, sur ses parts actuelles", async () => {
      vi.mocked(api.listLoans).mockResolvedValue([loan({ id: 4, repartie: false })])
      vi.mocked(api.getLoanQuotites).mockResolvedValue({ quotites: [], heritee: false })
      render(<LoansCard />)

      fireEvent.click(await screen.findByRole('button', { name: /^Répartir « Crédit immobilier »/ }))

      expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(50)
      expect(api.getLoanQuotites).toHaveBeenCalledWith(4)
    })

    it("sans membre dans le foyer, aucun badge « Non réparti » n'est affiché", async () => {
      vi.mocked(api.listDetenteurs).mockResolvedValue([])
      vi.mocked(api.listLoans).mockResolvedValue([loan({ id: 4, repartie: false })])
      render(<LoansCard />)

      await screen.findByText('Crédit immobilier')
      await vi.waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
      expect(screen.queryByText('Non réparti')).not.toBeInTheDocument()
    })

    it("un prêt dont `repartie` est absent (ancien serveur) n'est jamais signalé non réparti", async () => {
      vi.mocked(api.listLoans).mockResolvedValue([loan({ id: 4 })])
      render(<LoansCard />)

      await screen.findByText('Crédit immobilier')
      await vi.waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
      expect(screen.queryByText('Non réparti')).not.toBeInTheDocument()
    })

    it("enregistrer la répartition recharge la liste (le badge disparaît) sans masquer l'éditeur ouvert", async () => {
      vi.mocked(api.listLoans).mockResolvedValueOnce([loan({ id: 4, repartie: false })])
      vi.mocked(api.listLoans).mockResolvedValue([loan({ id: 4, repartie: true })])
      vi.mocked(api.getLoanQuotites).mockResolvedValue({ quotites: [], heritee: false })
      vi.mocked(api.setLoanQuotites).mockResolvedValue({ ok: true })
      render(<LoansCard />)
      fireEvent.click(await screen.findByRole('button', { name: /^Répartir « Crédit immobilier »/ }))
      await screen.findByLabelText('Part de Alice (%)')

      fireEvent.click(screen.getByRole('button', { name: 'Remplacer la répartition du prêt' }))

      expect(await screen.findByText('Répartition enregistrée.')).toBeInTheDocument()
      await vi.waitFor(() => expect(screen.queryByText('Non réparti')).not.toBeInTheDocument())
      expect(api.listLoans).toHaveBeenCalledTimes(2)
      // L'éditeur n'a pas été remplacé par un squelette de chargement.
      expect(screen.getByLabelText('Part de Alice (%)')).toBeInTheDocument()
    })

    it("vue d'un membre : le capital restant dû affiché est SA part, avec la mention « 50 % de 200 000 € », et le total en est la somme", async () => {
      preferences.detenteurId = 1
      vi.mocked(api.listLoans).mockResolvedValue([
        loan({ id: 4, capital_initial: 250000, capital_restant_du: 200000, part_capital_restant_du: 100000, quotite_pct: 50, repartie: true }),
      ])
      render(<LoansCard />)

      await screen.findByText('Crédit immobilier')
      expect(api.listLoans).toHaveBeenCalledWith(1)
      const normaliser = (x: string | null) => (x ?? '').replace(/[  ]/g, ' ')
      expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && normaliser(el.textContent) === '50 % de 200 000 €')).toBeInTheDocument()
      // Sa part (100 000 €) apparaît à la ligne ET dans le total ; la valeur entière (200 000 €) n'est que dans la mention.
      expect(screen.getAllByText('100 000 €').length).toBeGreaterThan(0)
      expect(screen.queryByText('200 000 €')).not.toBeInTheDocument()
    })

    it("hors vue d'un membre : listLoans(null), capital entier et aucune mention de part", async () => {
      vi.mocked(api.listLoans).mockResolvedValue([loan({ id: 4, capital_restant_du: 200000 })])
      render(<LoansCard />)

      await screen.findByText('Crédit immobilier')
      expect(api.listLoans).toHaveBeenCalledWith(null)
      expect(screen.getAllByText('200 000 €').length).toBeGreaterThan(0)
      expect(screen.queryByText(/ de 200/)).not.toBeInTheDocument()
    })
  })

  it('changer de membre sélectionné relit les prêts de CE membre', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([loan({ id: 4 })])
    const { rerender } = render(<LoansCard />)
    await screen.findByText('Crédit immobilier')

    preferences.detenteurId = 2
    rerender(<LoansCard />)

    await vi.waitFor(() => expect(api.listLoans).toHaveBeenCalledWith(2))
  })
})
