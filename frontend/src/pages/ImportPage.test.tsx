import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { BudgetImportResult, DernierImport, Etablissement, ImportPreview } from '../api/types'
import ImportPage from './ImportPage'

// Refonte de l'écran Import du 22/09/2026 : la page n'est plus une pile de cartes
// mais une grille de tuiles, et chaque tuile EST la zone de dépôt de sa source. Ce
// fichier verrouille donc trois choses — la grille elle-même (les cinq sources, leur
// pastille de dernier import), le fait qu'une seule source s'ouvre à la fois, et les
// comportements d'import déjà couverts avant la refonte (mouvements bancaires,
// backlog 2.N.1 ; établissement obligatoire sur le relevé de positions dès qu'une
// colonne Compte est mappée, refonte import du 05/09/2026), pour prouver que la
// refonte n'a touché qu'à la présentation.
vi.mock('../api/client', () => ({
  api: {
    importTransactions: vi.fn(),
    importPreview: vi.fn(),
    importConfirm: vi.fn(),
    importBudgetOfx: vi.fn(),
    importBudgetQif: vi.fn(),
    importBudgetCsvPreview: vi.fn(),
    importBudgetCsvConfirm: vi.fn(),
    listEtablissements: vi.fn().mockResolvedValue([]),
    getLogosEtablissements: vi.fn().mockResolvedValue({}),
    getLogosCatalogue: vi.fn().mockResolvedValue({}),
    importLedgerApercu: vi.fn(),
    importLedgerConfirm: vi.fn(),
    importBricksApercu: vi.fn(),
    importBricksConfirm: vi.fn(),
    getDerniersImports: vi.fn(),
  },
}))

beforeEach(() => {
  // Historique d'appels remis à zéro entre chaque test : plusieurs assertions
  // ci-dessous vérifient qu'une route n'a PAS été appelée (« un .qif ne doit pas
  // partir vers l'import OFX »), ce qu'un appel resté d'un test précédent
  // invaliderait silencieusement.
  vi.clearAllMocks()
  vi.mocked(api.getDerniersImports).mockResolvedValue([])
  vi.mocked(api.listEtablissements).mockResolvedValue([])
})

/** Zone de dépôt d'une tuile — `Dropzone` nomme son input d'après son `ariaLabel`,
 * que `TuileSourceImport` construit à partir du nom de la source. */
function tuile(nomSource: string): HTMLElement {
  return screen.getByTestId(`dropzone-input-Importer depuis ${nomSource}`)
}

function deposer(nomSource: string, f: File) {
  fireEvent.change(tuile(nomSource), { target: { files: [f] } })
}

function etablissement(overrides: Partial<Etablissement> = {}): Etablissement {
  return { id: 1, nom: 'Boursorama', logo_key: null, a_un_logo: false, logo_source: null, logo_maj_le: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00', ...overrides }
}

function previewPositions(overrides: Partial<ImportPreview> = {}): ImportPreview {
  return {
    file_token: 'token-positions',
    columns: ['Ticker', 'Quantité', 'Compte'],
    rows: [{ Ticker: 'AAPL', Quantité: '10', Compte: 'PEA' }],
    total_rows: 1,
    ...overrides,
  }
}

function fichier(nom: string, contenu = 'contenu'): File {
  return new File([contenu], nom, { type: 'text/plain' })
}

function preview(overrides: Partial<ImportPreview> = {}): ImportPreview {
  return {
    file_token: 'token-1',
    columns: ['Date', 'Libellé', 'Montant'],
    rows: [{ Date: '01/02/2026', Libellé: 'Salaire', Montant: '2000' }],
    total_rows: 1,
    ...overrides,
  }
}

function resultat(overrides: Partial<BudgetImportResult> = {}): BudgetImportResult {
  return { lignes_lues: 1, importees: 1, doublons_ignores: 0, lignes_ignorees: 0, categorisees_automatiquement: 0, ...overrides }
}

function trace(overrides: Partial<DernierImport> = {}): DernierImport {
  return { source: 'ledger', importe_le: '2026-09-14T08:30:00', nb_lignes: 312, ...overrides }
}

function renderImportPage() {
  return render(
    <MemoryRouter>
      <ImportPage />
    </MemoryRouter>,
  )
}

describe('ImportPage — grille des sources (refonte du 22/09/2026)', () => {
  it('propose les cinq sources en tuiles, chacune avec sa propre zone de dépôt', () => {
    renderImportPage()

    for (const nom of ['Trade Republic', 'Ledger', 'Bricks.co', 'Relevé de positions', 'Mouvements bancaires']) {
      expect(tuile(nom)).toBeInTheDocument()
    }
  })

  it('une source jamais importée le dit, au lieu de laisser la pastille vide', async () => {
    renderImportPage()

    await waitFor(() => expect(screen.getAllByText('Jamais importé')).toHaveLength(5))
  })

  it('affiche la date et le nombre de lignes du dernier import de chaque source', async () => {
    vi.mocked(api.getDerniersImports).mockResolvedValue([trace({ source: 'ledger', nb_lignes: 312 })])
    renderImportPage()

    await screen.findByText(/14\/09\/2026 · 312 lignes/)
    // Les quatre autres restent explicitement vierges.
    expect(screen.getAllByText('Jamais importé')).toHaveLength(4)
  })

  it("une trace sans décompte n'affiche que la date, jamais « 0 ligne »", async () => {
    vi.mocked(api.getDerniersImports).mockResolvedValue([trace({ nb_lignes: null })])
    renderImportPage()

    const pastille = await screen.findByText(/14\/09\/2026/)
    expect(pastille.textContent).not.toMatch(/ligne/)
  })

  it("le bouton d'aide d'une tuile ouvre le guide d'export de CETTE source", async () => {
    renderImportPage()

    fireEvent.click(screen.getByRole('button', { name: 'Comment exporter depuis Ledger ?' }))

    await screen.findByText('Exporter depuis Ledger')
    expect(screen.getByText(/Ouvre Ledger Live sur ton ordinateur\./)).toBeInTheDocument()
    expect(screen.queryByText('Exporter depuis Bricks.co')).not.toBeInTheDocument()
  })

  it("n'ouvre le panneau d'import que de la source sur laquelle le fichier est déposé", async () => {
    vi.mocked(api.importPreview).mockResolvedValue(previewPositions())
    renderImportPage()

    deposer('Relevé de positions', fichier('releve.csv'))

    await screen.findByLabelText('Colonne Ticker *')
    // Le panneau bancaire, lui, n'est pas monté : ses champs n'existent pas.
    expect(screen.queryByLabelText('Colonne Date *')).not.toBeInTheDocument()
    expect(api.importBudgetCsvPreview).not.toHaveBeenCalled()
  })

  it('déposer un fichier sur une autre tuile remplace le panneau ouvert', async () => {
    vi.mocked(api.importPreview).mockResolvedValue(previewPositions())
    vi.mocked(api.importBudgetCsvPreview).mockResolvedValue(preview())
    renderImportPage()

    deposer('Relevé de positions', fichier('releve.csv'))
    await screen.findByLabelText('Colonne Ticker *')

    deposer('Mouvements bancaires', fichier('banque.csv'))

    await screen.findByLabelText('Colonne Date *')
    expect(screen.queryByLabelText('Colonne Ticker *')).not.toBeInTheDocument()
  })
})

describe('ImportPage — mouvements bancaires (backlog 2.N.1)', () => {
  it('un fichier .ofx appelle importBudgetOfx (pas importBudgetQif)', async () => {
    vi.mocked(api.importBudgetOfx).mockResolvedValue(resultat({ importees: 3 }))
    renderImportPage()

    deposer('Mouvements bancaires', fichier('releve.ofx'))

    await screen.findByText(/3 mouvement\(s\) importé\(s\)/)
    expect(api.importBudgetOfx).toHaveBeenCalledTimes(1)
    expect(api.importBudgetQif).not.toHaveBeenCalled()
  })

  it('un fichier .qif appelle importBudgetQif (pas importBudgetOfx)', async () => {
    vi.mocked(api.importBudgetQif).mockResolvedValue(resultat({ importees: 2 }))
    renderImportPage()

    deposer('Mouvements bancaires', fichier('releve.qif'))

    await screen.findByText(/2 mouvement\(s\) importé\(s\)/)
    expect(api.importBudgetQif).toHaveBeenCalledTimes(1)
    expect(api.importBudgetOfx).not.toHaveBeenCalled()
  })

  it('un fichier .csv passe par le mapping de colonnes, pas par un import direct', async () => {
    vi.mocked(api.importBudgetCsvPreview).mockResolvedValue(preview())
    renderImportPage()

    deposer('Mouvements bancaires', fichier('releve.csv'))

    await screen.findByLabelText('Colonne Date *')
    expect(api.importBudgetOfx).not.toHaveBeenCalled()
    expect(api.importBudgetQif).not.toHaveBeenCalled()
  })

  it('affiche les doublons et lignes ignorées quand présents', async () => {
    vi.mocked(api.importBudgetOfx).mockResolvedValue(resultat({ importees: 1, doublons_ignores: 2, lignes_ignorees: 1 }))
    renderImportPage()

    deposer('Mouvements bancaires', fichier('r.ofx'))

    await screen.findByText(/1 mouvement\(s\) importé\(s\), 2 déjà présent\(s\), 1 ligne\(s\) illisible\(s\) ignorée\(s\)\./)
  })

  it("affiche une erreur si l'import échoue", async () => {
    vi.mocked(api.importBudgetOfx).mockRejectedValue(new Error('format invalide'))
    renderImportPage()

    deposer('Mouvements bancaires', fichier('r.ofx'))

    await screen.findByText('format invalide')
  })

  it('CSV : aperçu puis confirmation en mode montant signé', async () => {
    vi.mocked(api.importBudgetCsvPreview).mockResolvedValue(preview())
    vi.mocked(api.importBudgetCsvConfirm).mockResolvedValue(resultat({ importees: 5 }))
    renderImportPage()

    deposer('Mouvements bancaires', fichier('releve.csv'))
    await screen.findByRole('columnheader', { name: 'Date' })

    fireEvent.change(screen.getByLabelText('Colonne Date *'), { target: { value: 'Date' } })
    fireEvent.change(screen.getByLabelText('Colonne Libellé *'), { target: { value: 'Libellé' } })
    fireEvent.change(screen.getByLabelText('Colonne Montant *'), { target: { value: 'Montant' } })
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'import" }))

    await screen.findByText(/5 mouvement\(s\) importé\(s\)/)
    expect(api.importBudgetCsvConfirm).toHaveBeenCalledWith({
      file_token: 'token-1',
      date_col: 'Date',
      libelle_col: 'Libellé',
      montant_col: 'Montant',
      debit_col: null,
      credit_col: null,
      compte: null,
    })
  })

  it('CSV : bascule débit/crédit envoie les bonnes colonnes, montant_col à null', async () => {
    vi.mocked(api.importBudgetCsvPreview).mockResolvedValue(preview({ columns: ['Date', 'Libellé', 'Débit', 'Crédit'] }))
    vi.mocked(api.importBudgetCsvConfirm).mockResolvedValue(resultat())
    renderImportPage()

    deposer('Mouvements bancaires', fichier('releve.csv'))
    await screen.findByRole('columnheader', { name: 'Date' })

    fireEvent.change(screen.getByLabelText('Colonne Date *'), { target: { value: 'Date' } })
    fireEvent.change(screen.getByLabelText('Colonne Libellé *'), { target: { value: 'Libellé' } })
    fireEvent.click(screen.getByLabelText('Deux colonnes débit/crédit séparées'))
    fireEvent.change(screen.getByLabelText('Colonne Débit'), { target: { value: 'Débit' } })
    fireEvent.change(screen.getByLabelText('Colonne Crédit'), { target: { value: 'Crédit' } })
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'import" }))

    await screen.findByText(/mouvement\(s\) importé\(s\)/)
    expect(api.importBudgetCsvConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ montant_col: null, debit_col: 'Débit', credit_col: 'Crédit' }),
    )
  })

  it('le bouton de confirmation reste désactivé tant que Date/Libellé/Montant ne sont pas choisis', async () => {
    vi.mocked(api.importBudgetCsvPreview).mockResolvedValue(preview())
    renderImportPage()

    deposer('Mouvements bancaires', fichier('releve.csv'))
    await screen.findByRole('columnheader', { name: 'Date' })

    expect(screen.getByRole('button', { name: "Confirmer l'import" })).toBeDisabled()
  })
})

describe('ImportPage — relevé de positions, établissement des comptes créés (refonte import, 05/09/2026)', () => {
  it("sans colonne Compte mappée, aucun sélecteur d'établissement n'apparaît et la confirmation ne l'exige pas", async () => {
    vi.mocked(api.importPreview).mockResolvedValue(previewPositions())
    vi.mocked(api.importConfirm).mockResolvedValue({ imported: 1, skipped: 0, errors: [] })
    renderImportPage()

    deposer('Relevé de positions', fichier('releve.csv'))
    await screen.findByRole('columnheader', { name: 'Ticker' })

    expect(screen.queryByText('Établissement des comptes créés *')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Colonne Ticker *'), { target: { value: 'Ticker' } })
    fireEvent.change(screen.getByLabelText('Colonne Quantité *'), { target: { value: 'Quantité' } })
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'import" }))

    await screen.findByText(/1 ligne\(s\) importée\(s\)/)
    expect(api.importConfirm).toHaveBeenCalledWith(expect.objectContaining({ etablissement_id: null, etablissement_nom: null }))
  })

  it('colonne Compte mappée sans établissement choisi : la confirmation reste désactivée', async () => {
    vi.mocked(api.listEtablissements).mockResolvedValue([etablissement()])
    vi.mocked(api.importPreview).mockResolvedValue(previewPositions())
    renderImportPage()

    deposer('Relevé de positions', fichier('releve.csv'))
    await screen.findByRole('columnheader', { name: 'Ticker' })
    fireEvent.change(screen.getByLabelText('Colonne Ticker *'), { target: { value: 'Ticker' } })
    fireEvent.change(screen.getByLabelText('Colonne Quantité *'), { target: { value: 'Quantité' } })
    fireEvent.change(screen.getByLabelText('Compte (optionnel)'), { target: { value: 'Compte' } })

    await screen.findByText('Établissement des comptes créés *')
    expect(screen.getByRole('button', { name: "Confirmer l'import" })).toBeDisabled()
  })

  it('colonne Compte mappée avec un établissement existant choisi : la confirmation le transmet', async () => {
    vi.mocked(api.listEtablissements).mockResolvedValue([etablissement({ id: 7, nom: 'Boursorama' })])
    vi.mocked(api.importPreview).mockResolvedValue(previewPositions())
    vi.mocked(api.importConfirm).mockResolvedValue({ imported: 1, skipped: 0, errors: [] })
    renderImportPage()

    deposer('Relevé de positions', fichier('releve.csv'))
    await screen.findByRole('columnheader', { name: 'Ticker' })
    fireEvent.change(screen.getByLabelText('Colonne Ticker *'), { target: { value: 'Ticker' } })
    fireEvent.change(screen.getByLabelText('Colonne Quantité *'), { target: { value: 'Quantité' } })
    fireEvent.change(screen.getByLabelText('Compte (optionnel)'), { target: { value: 'Compte' } })
    await screen.findByText('Établissement des comptes créés *')

    fireEvent.change(screen.getByLabelText('Établissement des comptes créés'), { target: { value: '7' } })
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'import" }))

    await screen.findByText(/1 ligne\(s\) importée\(s\)/)
    expect(api.importConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ compte_col: 'Compte', etablissement_id: 7, etablissement_nom: null }),
    )
  })
})

describe('ImportPage — rafraîchissement des pastilles après un import', () => {
  it('un import abouti recharge les dates, pour que la tuile ne reste pas sur « jamais importé »', async () => {
    vi.mocked(api.getDerniersImports).mockResolvedValueOnce([])
    vi.mocked(api.importBudgetOfx).mockResolvedValue(resultat({ importees: 3 }))
    vi.mocked(api.getDerniersImports).mockResolvedValue([
      trace({ source: 'bancaire', importe_le: '2026-09-22T10:00:00', nb_lignes: 3 }),
    ])
    renderImportPage()

    deposer('Mouvements bancaires', fichier('releve.ofx'))

    await screen.findByText(/22\/09\/2026 · 3 lignes/)
  })
})
