import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { BudgetSummary, CategorieBudget, Compte, JonctionPatrimoine, MouvementBancaire, RecurrenceDetectee, RegleCategorisation } from '../api/types'
import BudgetPage from './BudgetPage'

vi.mock('../api/client', () => ({
  api: {
    getBudgetSummary: vi.fn(),
    listMouvementsBancaires: vi.fn(),
    listCategoriesBudget: vi.fn(),
    listReglesCategorisation: vi.fn(),
    setBudgetCible: vi.fn(),
    categoriserMouvement: vi.fn(),
    createCategorieBudget: vi.fn(),
    deleteCategorieBudget: vi.fn(),
    createRegleCategorisation: vi.fn(),
    deleteRegleCategorisation: vi.fn(),
    reappliquerReglesCategorisation: vi.fn(),
    getBudgetRecurrences: vi.fn(),
    getJonctionPatrimoine: vi.fn(),
    listComptesBudget: vi.fn(),
  },
}))

vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ montantsMasques: false }),
}))

function summary(overrides: Partial<BudgetSummary> = {}): BudgetSummary {
  return {
    entrees: 2000,
    sorties: 950,
    disponible: 1050,
    depenses_recurrentes_mensuelles: 15,
    repartition_sorties: [{ categorie_id: 1, categorie_nom: 'Transport', montant: 50, cible_mensuelle: 100 }],
    ...overrides,
  }
}

function mouvement(overrides: Partial<MouvementBancaire> = {}): MouvementBancaire {
  return {
    id: 1,
    date: '2026-02-01',
    libelle: 'SNCF Connect',
    montant: -50,
    compte_id: null,
    categorie_id: 1,
    categorise_manuellement: false,
    ...overrides,
  }
}

function compte(id: number, nom: string, etablissement: string | null): Compte {
  const date = '2026-01-01T00:00:00'
  return {
    id,
    nom,
    etablissement: etablissement
      ? { id: id * 10, nom: etablissement, logo_key: null, a_un_logo: false, logo_source: null, logo_maj_le: null, created_at: date, updated_at: date }
      : null,
    created_at: date,
    updated_at: date,
  }
}

function categorie(overrides: Partial<CategorieBudget> = {}): CategorieBudget {
  return { id: 1, nom: 'Transport', parent_id: null, ...overrides }
}

function regle(overrides: Partial<RegleCategorisation> = {}): RegleCategorisation {
  return { id: 1, motif: 'sncf', categorie_id: 1, ...overrides }
}

function recurrence(overrides: Partial<RecurrenceDetectee> = {}): RecurrenceDetectee {
  return {
    libelle: 'Netflix',
    categorie_id: null,
    montant_actuel: 12.99,
    montant_precedent: 12.99,
    montant_initial: 12.99,
    variation_prix_pct: 0,
    hausse_prix: false,
    occurrences: 3,
    premiere_date: '2025-12-05',
    derniere_date: '2026-02-05',
    periodicite: 'mensuelle',
    cout_annuel_estime: 155.88,
    total_periode: 38.97,
    ...overrides,
  }
}

function jonction(overrides: Partial<JonctionPatrimoine> = {}): JonctionPatrimoine {
  return {
    taux_epargne_reel_pct: 20,
    reste_a_vivre: 1500,
    versement_mensuel_suggere: 400,
    versement_mensuel_epargne_declare: 0,
    categorie_epargne_introuvable: false,
    categorie_logement_introuvable: false,
    ...overrides,
  }
}

function mockChargement(overrides: {
  summary?: BudgetSummary
  mouvements?: MouvementBancaire[]
  categories?: CategorieBudget[]
  regles?: RegleCategorisation[]
  recurrences?: RecurrenceDetectee[]
  jonction?: JonctionPatrimoine
  comptes?: Compte[]
} = {}) {
  vi.mocked(api.getBudgetSummary).mockResolvedValue(overrides.summary ?? summary())
  vi.mocked(api.listMouvementsBancaires).mockResolvedValue(overrides.mouvements ?? [mouvement()])
  vi.mocked(api.listCategoriesBudget).mockResolvedValue(overrides.categories ?? [categorie()])
  vi.mocked(api.listReglesCategorisation).mockResolvedValue(overrides.regles ?? [regle()])
  vi.mocked(api.getBudgetRecurrences).mockResolvedValue(overrides.recurrences ?? [])
  vi.mocked(api.getJonctionPatrimoine).mockResolvedValue(
    overrides.jonction ?? jonction({ taux_epargne_reel_pct: null, reste_a_vivre: null }),
  )
  vi.mocked(api.listComptesBudget).mockResolvedValue(overrides.comptes ?? [])
}

describe('BudgetPage — indicateurs et répartition (backlog 2.N.2)', () => {
  // Refonte « liquid glass » (étape 4) : les quatre tuiles de même poids laissent la
  // place à un bloc héros — « Disponible », le chiffre qui répond à la question qu'on
  // se pose en ouvrant cet écran — avec entrées et sorties en sous-titre.
  it('affiche le disponible en chiffre héros, avec entrées et sorties en dessous', async () => {
    mockChargement()
    render(<BudgetPage />)

    // Scopé au bloc héros : « 1 050 € » y apparaît deux fois — comme chiffre
    // principal, et comme légende du segment « Non dépensé » de la barre, qui vaut
    // par construction le même montant.
    const heros = (await screen.findByText('Disponible sur la période')).parentElement as HTMLElement
    expect(heros).toHaveTextContent('1 050 €')
    expect(heros).toHaveTextContent("2 000 € d'entrées − 950 € de sorties")
    expect(screen.getByText('15 €')).toBeInTheDocument()
  })

  it('affiche un état vide si aucun mouvement sur la période', async () => {
    mockChargement({ mouvements: [] })
    render(<BudgetPage />)

    expect(await screen.findByText('Aucun mouvement bancaire importé pour cette période.')).toBeInTheDocument()
    expect(screen.queryByText('Entrées')).not.toBeInTheDocument()
  })

  it('affiche la répartition des sorties avec la cible et l\'écart', async () => {
    mockChargement()
    render(<BudgetPage />)

    const [tableRepartition] = await screen.findAllByRole('table')
    const ligne = within(tableRepartition).getByText('Transport').closest('tr')!
    expect(within(ligne).getByText('50,00 €', { selector: '.text-texte' })).toBeInTheDocument()
    expect(within(ligne).getByDisplayValue('100')).toBeInTheDocument()
    expect(within(ligne).getByText('50,00 €', { selector: '.text-positif' })).toBeInTheDocument()
  })

  it('modifier la cible appelle setBudgetCible et recharge', async () => {
    mockChargement()
    vi.mocked(api.setBudgetCible).mockResolvedValue({ categorie_id: 1, montant_mensuel: 200 })
    render(<BudgetPage />)

    await screen.findByDisplayValue('100')
    const champ = screen.getByDisplayValue('100')
    fireEvent.change(champ, { target: { value: '200' } })
    fireEvent.blur(champ)

    await waitFor(() => expect(api.setBudgetCible).toHaveBeenCalledWith(1, 200))
  })
})

describe('BudgetPage — mouvements (backlog 2.N.1)', () => {
  it('recatégoriser un mouvement appelle categoriserMouvement', async () => {
    mockChargement({ categories: [categorie({ id: 1, nom: 'Transport' }), categorie({ id: 2, nom: 'Loisirs' })] })
    vi.mocked(api.categoriserMouvement).mockResolvedValue(mouvement({ categorie_id: 2 }))
    render(<BudgetPage />)

    await screen.findByText('SNCF Connect')
    const select = screen.getByDisplayValue('Transport')
    fireEvent.change(select, { target: { value: '2' } })

    await waitFor(() => expect(api.categoriserMouvement).toHaveBeenCalledWith(1, 2))
  })

  it('le filtre par catégorie masque les mouvements des autres catégories', async () => {
    mockChargement({
      categories: [categorie({ id: 1, nom: 'Transport' }), categorie({ id: 2, nom: 'Loisirs' })],
      mouvements: [mouvement({ id: 1, libelle: 'SNCF Connect', categorie_id: 1 }), mouvement({ id: 2, libelle: 'Ciné', categorie_id: 2 })],
    })
    render(<BudgetPage />)

    await screen.findByText('SNCF Connect')
    expect(screen.getByText('Ciné')).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue('Toutes catégories'), { target: { value: '1' } })

    expect(screen.getByText('SNCF Connect')).toBeInTheDocument()
    expect(screen.queryByText('Ciné')).not.toBeInTheDocument()
  })

})

describe('BudgetPage — filtre par compte (§ BM.1)', () => {
  const COMPTES = [compte(1, 'Compte joint', 'Boursorama'), compte(2, 'Compte courant', 'Caisse d\'Épargne'), compte(3, 'Livret', null)]

  it('propose les comptes regroupés par établissement, sans établissement en dernier', async () => {
    mockChargement({ comptes: COMPTES })
    render(<BudgetPage />)

    const filtre = await screen.findByRole('combobox', { name: 'Compte' })
    const groupes = within(filtre).getAllByRole('group')
    expect(groupes.map((g) => g.getAttribute('label'))).toEqual(['Boursorama', "Caisse d'Épargne", 'Sans établissement'])
    expect(within(groupes[0]).getByRole('option', { name: 'Compte joint' })).toBeInTheDocument()
    expect(filtre).toHaveValue('')
  })

  it("choisir un compte recharge tout l'écran filtré sur ce compte, puis « Tous les comptes » le retire", async () => {
    mockChargement({ comptes: COMPTES })
    render(<BudgetPage />)

    const filtre = await screen.findByRole('combobox', { name: 'Compte' })
    expect(api.getBudgetSummary).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), null)

    fireEvent.change(filtre, { target: { value: '2' } })

    await waitFor(() => expect(api.getBudgetSummary).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), 2))
    expect(api.listMouvementsBancaires).toHaveBeenLastCalledWith(expect.objectContaining({ compteId: 2 }))
    expect(api.getBudgetRecurrences).toHaveBeenLastCalledWith(2)
    expect(api.getJonctionPatrimoine).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), 2)

    fireEvent.change(await screen.findByRole('combobox', { name: 'Compte' }), { target: { value: '' } })

    await waitFor(() => expect(api.getBudgetSummary).toHaveBeenLastCalledWith(expect.any(String), expect.any(String), null))
  })

  it("n'affiche pas le filtre quand un seul compte porte des mouvements", async () => {
    mockChargement({ comptes: [COMPTES[0]] })
    render(<BudgetPage />)

    await screen.findByText('SNCF Connect')
    expect(screen.queryByRole('combobox', { name: 'Compte' })).not.toBeInTheDocument()
  })
})

describe('BudgetPage — catégories et règles (backlog 2.N.1)', () => {
  it('ajouter une catégorie appelle createCategorieBudget puis recharge', async () => {
    mockChargement()
    vi.mocked(api.createCategorieBudget).mockResolvedValue(categorie({ id: 2, nom: 'Santé' }))
    render(<BudgetPage />)

    await screen.findByPlaceholderText('Nouvelle catégorie')
    fireEvent.change(screen.getByPlaceholderText('Nouvelle catégorie'), { target: { value: 'Santé' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => expect(api.createCategorieBudget).toHaveBeenCalledWith('Santé'))
  })

  it('ajouter une règle appelle createRegleCategorisation avec le motif et la catégorie choisis', async () => {
    mockChargement()
    vi.mocked(api.createRegleCategorisation).mockResolvedValue(regle({ id: 2, motif: 'uber', categorie_id: 1 }))
    render(<BudgetPage />)

    await screen.findByPlaceholderText('Nouvelle catégorie')
    fireEvent.change(screen.getByPlaceholderText('Motif (ex. sncf)'), { target: { value: 'uber' } })
    fireEvent.change(screen.getByDisplayValue('— Catégorie —'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter la règle' }))

    await waitFor(() => expect(api.createRegleCategorisation).toHaveBeenCalledWith('uber', 1))
  })

  it('réappliquer les règles appelle reappliquerReglesCategorisation et affiche le résultat', async () => {
    mockChargement()
    vi.mocked(api.reappliquerReglesCategorisation).mockResolvedValue({ mouvements_modifies: 3 })
    render(<BudgetPage />)

    await screen.findByPlaceholderText('Nouvelle catégorie')
    fireEvent.click(screen.getByRole('button', { name: 'Réappliquer les règles en masse' }))

    await screen.findByText('3 mouvements recatégorisés.')
  })

  it('supprimer une catégorie appelle deleteCategorieBudget', async () => {
    mockChargement()
    vi.mocked(api.deleteCategorieBudget).mockResolvedValue(undefined)
    render(<BudgetPage />)

    await screen.findByPlaceholderText('Nouvelle catégorie')
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Transport' }))

    await waitFor(() => expect(api.deleteCategorieBudget).toHaveBeenCalledWith(1))
  })
})

describe('BudgetPage — récurrences et abonnements (backlog 2.N.3)', () => {
  it("n'affiche pas la section s'il n'y a aucune récurrence détectée", async () => {
    mockChargement({ recurrences: [] })
    render(<BudgetPage />)

    await screen.findByPlaceholderText('Nouvelle catégorie')
    expect(screen.queryByText('Charges récurrentes et abonnements')).not.toBeInTheDocument()
  })

  it('liste les récurrences détectées avec leur périodicité et leurs occurrences', async () => {
    mockChargement({ recurrences: [recurrence()] })
    render(<BudgetPage />)

    await screen.findByText('Charges récurrentes et abonnements')
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(screen.getByText('Mensuelle')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('12,99 €')).toBeInTheDocument()
    expect(screen.queryByText('Hausse de prix')).not.toBeInTheDocument()
  })

  it('affiche le coût annuel estimé des séries périodiques', async () => {
    mockChargement({ recurrences: [recurrence()] })
    render(<BudgetPage />)

    await screen.findByText('Coût annuel estimé')
    const ligneNetflix = screen.getByText('Netflix').closest('tr') as HTMLElement
    expect(within(ligneNetflix).getByText('155,88 €')).toBeInTheDocument()
  })

  describe('achats fréquents (séries sans rythme)', () => {
    const achat = recurrence({
      libelle: 'Supermarché du coin',
      periodicite: 'irreguliere',
      montant_actuel: 54.2,
      cout_annuel_estime: null,
      occurrences: 7,
      total_periode: 361.5,
    })

    it("ne les mêle pas à la liste des charges : bloc replié « Achats fréquents » avec occurrences et total", async () => {
      mockChargement({ recurrences: [recurrence(), achat] })
      render(<BudgetPage />)

      const resume = await screen.findByText(/Achats fréquents/)
      const bloc = resume.closest('details') as HTMLDetailsElement
      expect(bloc.open).toBe(false)
      expect(resume.textContent).toContain('(1)')
      // Hors du bloc : la liste principale ne contient que la série périodique.
      expect(bloc.contains(screen.getByText('Netflix'))).toBe(false)
      // Dans le bloc : occurrences et total observé.
      const ligne = within(bloc).getByText('Supermarché du coin').closest('tr') as HTMLElement
      expect(within(ligne).getByText('7')).toBeInTheDocument()
      expect(within(ligne).getByText('361,50 €')).toBeInTheDocument()
    })

    it("sans série périodique, seul le bloc replié est présenté", async () => {
      mockChargement({ recurrences: [achat] })
      render(<BudgetPage />)

      await screen.findByText(/Achats fréquents/)
      expect(screen.queryByText('Coût annuel estimé')).not.toBeInTheDocument()
    })
  })

  it('nomme les périodicités trimestrielle et annuelle', async () => {
    mockChargement({
      recurrences: [
        recurrence({ libelle: 'Cotisation', periodicite: 'trimestrielle', montant_actuel: 45, cout_annuel_estime: 180 }),
        recurrence({ libelle: 'Assurance', periodicite: 'annuelle', montant_actuel: 336, cout_annuel_estime: 336 }),
      ],
    })
    render(<BudgetPage />)

    await screen.findByText('Trimestrielle')
    expect(screen.getByText('Annuelle')).toBeInTheDocument()
    expect(screen.getByText('180,00 €')).toBeInTheDocument()
  })

  it("rappelle d'où vient une hausse de prix progressive", async () => {
    mockChargement({
      recurrences: [recurrence({ hausse_prix: true, montant_actuel: 10.9, montant_precedent: 10.6, montant_initial: 10, variation_prix_pct: 9 })],
    })
    render(<BudgetPage />)

    await screen.findByText('Hausse de prix')
    expect(screen.getByText('+9,0 % depuis 10,00 €')).toBeInTheDocument()
  })

  it('affiche un badge « Hausse de prix » quand détectée', async () => {
    mockChargement({ recurrences: [recurrence({ hausse_prix: true, montant_actuel: 14.99, montant_precedent: 12.99 })] })
    render(<BudgetPage />)

    await screen.findByText('Hausse de prix')
  })

  it("s'affiche même si la période sélectionnée n'a aucun mouvement (fenêtre indépendante)", async () => {
    mockChargement({ mouvements: [], recurrences: [recurrence()] })
    render(<BudgetPage />)

    await screen.findByText('Aucun mouvement bancaire importé pour cette période.')
    expect(screen.getByText('Charges récurrentes et abonnements')).toBeInTheDocument()
  })
})

describe('BudgetPage — jonction budget/patrimoine (backlog 2.N.4)', () => {
  it("n'affiche pas le taux d'épargne ni le reste à vivre si les catégories n'existent pas", async () => {
    mockChargement()
    render(<BudgetPage />)

    await screen.findByPlaceholderText('Nouvelle catégorie')
    expect(screen.queryByText("Taux d'épargne réel")).not.toBeInTheDocument()
    expect(screen.queryByText('Reste à vivre')).not.toBeInTheDocument()
  })

  it("affiche le taux d'épargne réel et le reste à vivre quand disponibles", async () => {
    mockChargement({ jonction: jonction({ taux_epargne_reel_pct: 25.5, reste_a_vivre: 1200 }) })
    render(<BudgetPage />)

    await screen.findByText("Taux d'épargne réel")
    expect(screen.getByText('25,5 %')).toBeInTheDocument()
    expect(screen.getByText('Reste à vivre')).toBeInTheDocument()
    expect(screen.getByText('1 200 €')).toBeInTheDocument()
  })

  it('affiche un message explicatif quand la catégorie Épargne ou Logement est introuvable', async () => {
    mockChargement({
      jonction: jonction({ taux_epargne_reel_pct: null, categorie_epargne_introuvable: true, reste_a_vivre: null, categorie_logement_introuvable: true }),
    })
    render(<BudgetPage />)

    await screen.findByText(/Taux d'épargne indisponible/)
    expect(screen.getByText(/Reste à vivre indisponible/)).toBeInTheDocument()
  })
})
