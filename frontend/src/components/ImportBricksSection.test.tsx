import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { BricksApercu, BricksImportResult, Etablissement } from '../api/types'
import ImportBricksSection from './ImportBricksSection'

vi.mock('../api/client', () => ({
  api: {
    importBricksApercu: vi.fn(),
    importBricksConfirm: vi.fn(),
  },
}))

function etablissement(overrides: Partial<Etablissement> = {}): Etablissement {
  return {
    id: 1,
    nom: 'Bricks.co',
    logo_key: 'bricks_co',
    a_un_logo: false,
    logo_source: null,
    logo_maj_le: null,
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    ...overrides,
  }
}

function apercu(overrides: Partial<BricksApercu> = {}): BricksApercu {
  return {
    file_token: 'token-1',
    lignes_lues: 200,
    lignes_ignorees_statut: 10,
    lignes_ignorees_type_operation: { 'Crédit par carte': 5 },
    lignes_ignorees_remboursement_sans_achat: 0,
    nb_biens: 42,
    montant_total_investi: 970,
    etablissements: [etablissement()],
    ...overrides,
  }
}

function resultat(overrides: Partial<BricksImportResult> = {}): BricksImportResult {
  return {
    lignes_lues: 200,
    importees: 180,
    mises_a_jour: 0,
    doublons_ignores: 0,
    lignes_ignorees: 15,
    positions_recalculees: 42,
    anomalies_detectees: 0,
    comptes_crees: 1,
    ...overrides,
  }
}

function fichier(nom: string): File {
  return new File(['contenu'], nom, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function renderCard() {
  return render(
    <MemoryRouter>
      <ImportBricksSection />
    </MemoryRouter>,
  )
}

async function ouvrirApercu(apercuMocke: BricksApercu) {
  vi.mocked(api.importBricksApercu).mockResolvedValue(apercuMocke)
  renderCard()

  fireEvent.change(screen.getByTestId('dropzone-input-Crowdfunding immobilier Bricks.co'), { target: { files: [fichier('bricks.xlsx')] } })
  await screen.findByLabelText('Établissement *')
}

describe('ImportBricksSection', () => {
  it('affiche le résumé (biens détectés, montant investi, lignes hors suivi)', async () => {
    await ouvrirApercu(apercu())

    expect(screen.getByText(/42 biens détectés/)).toBeInTheDocument()
    expect(screen.getByText(/15 lignes hors suivi d'investissement non importées/)).toBeInTheDocument()
  })

  it('le bouton de confirmation reste désactivé sans établissement choisi', async () => {
    await ouvrirApercu(apercu())

    expect(screen.getByRole('button', { name: "Confirmer l'import" })).toBeDisabled()
  })

  it('confirme avec le nom de compte par défaut "Bricks.co"', async () => {
    vi.mocked(api.importBricksConfirm).mockResolvedValue(resultat())
    await ouvrirApercu(apercu())

    fireEvent.change(screen.getByLabelText('Établissement *'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'import" }))

    await screen.findByText(/opérations? importées?/)
    expect(api.importBricksConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ file_token: 'token-1', etablissement_id: 1, nom_compte: 'Bricks.co' }),
    )
  })

  it('affiche le bandeau de résultat après confirmation', async () => {
    vi.mocked(api.importBricksConfirm).mockResolvedValue(resultat({ importees: 180, comptes_crees: 1, positions_recalculees: 42 }))
    await ouvrirApercu(apercu())

    fireEvent.change(screen.getByLabelText('Établissement *'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'import" }))

    expect(await screen.findByText(/180 opérations importées/)).toBeInTheDocument()
    expect(screen.getByText(/42 positions recalculées.*1 compte créé/)).toBeInTheDocument()
  })
})
