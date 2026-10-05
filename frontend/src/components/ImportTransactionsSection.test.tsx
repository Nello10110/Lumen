import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Etablissement, TransactionImportApercu, TransactionImportResult } from '../api/types'
import { suiteQuestionImport } from '../test/questionImport'
import ImportTransactionsSection from './ImportTransactionsSection'

vi.mock('../api/client', () => ({
  api: {
    importTransactionsApercu: vi.fn(),
    importTransactionsConfirm: vi.fn(),
    // Question « À quel membre ? » d'un import (§ BN.1, lot 3) : sans membre par défaut.
    listDetenteurs: vi.fn().mockResolvedValue([]),
  },
}))

function etablissement(overrides: Partial<Etablissement> = {}): Etablissement {
  return {
    id: 1,
    nom: 'Banque Test',
    logo_key: null,
    a_un_logo: false,
    logo_source: null,
    logo_maj_le: null,
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    ...overrides,
  }
}

function apercu(overrides: Partial<TransactionImportApercu> = {}): TransactionImportApercu {
  return {
    file_token: 'token-1',
    lignes_lues: 3,
    mouvements_hors_bourse_exclus: 0,
    comptages: { pea: 3 },
    noms_par_defaut: { pea: 'PEA' },
    etablissements: [etablissement()],
    ...overrides,
  }
}

function resultat(overrides: Partial<TransactionImportResult> = {}): TransactionImportResult {
  return {
    lignes_lues: 3,
    importees: 3,
    mises_a_jour: 0,
    doublons_ignores: 0,
    mouvements_hors_bourse_exclus: 0,
    positions_recalculees: 1,
    anomalies_detectees: 0,
    lignes_manuelles_remplacees: 0,
    comptes_crees: 0,
    ...overrides,
  }
}

function fichier(nom: string): File {
  return new File(['contenu'], nom, { type: 'text/csv' })
}

async function importerJusquauResultat(resultatMocke: TransactionImportResult) {
  vi.mocked(api.importTransactionsApercu).mockResolvedValue(apercu())
  vi.mocked(api.importTransactionsConfirm).mockResolvedValue(resultatMocke)

  render(
    <MemoryRouter>
      <ImportTransactionsSection />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByTestId('dropzone-input-Historique de transactions'), { target: { files: [fichier('releve.csv')] } })
  await screen.findByLabelText('Établissement *')

  fireEvent.change(screen.getByLabelText('Établissement *'), { target: { value: '1' } })
  fireEvent.click(screen.getByRole('button', { name: "Confirmer l'import" }))

  await screen.findByText(/transactions? importées?/)
}

describe('ImportTransactionsSection — bandeau de résultat', () => {
  it('ne mentionne ni mise à jour ni doublon quand tout est nouveau', async () => {
    await importerJusquauResultat(resultat({ importees: 3, mises_a_jour: 0, doublons_ignores: 0 }))

    expect(screen.getByText(/3 transactions importées/)).toBeInTheDocument()
    expect(screen.queryByText(/mises? à jour/)).not.toBeInTheDocument()
    expect(screen.queryByText(/déjà présente/)).not.toBeInTheDocument()
  })

  it('signale les lignes mises à jour lors d’un ré-import corrigé (retour utilisateur du 10/09/2026)', async () => {
    await importerJusquauResultat(resultat({ importees: 1, mises_a_jour: 2, doublons_ignores: 1 }))

    expect(screen.getByText(/1 transaction importée, 2 mises à jour, 1 déjà présente et inchangée/)).toBeInTheDocument()
  })
})

suiteQuestionImport('ImportTransactionsSection', {
  async ouvrir(enveloppe) {
    vi.mocked(api.importTransactionsApercu).mockResolvedValue(apercu())
    render(enveloppe(<ImportTransactionsSection />))
    fireEvent.change(screen.getByTestId('dropzone-input-Historique de transactions'), { target: { files: [fichier('releve.csv')] } })
    await screen.findByLabelText('Établissement *')
    fireEvent.change(screen.getByLabelText('Établissement *'), { target: { value: '1' } })
  },
  confirm: () => vi.mocked(api.importTransactionsConfirm),
  confirmationReussit: () => vi.mocked(api.importTransactionsConfirm).mockResolvedValue(resultat()),
  confirmationEchoue: () => vi.mocked(api.importTransactionsConfirm).mockRejectedValue(new Error('Import impossible')),
  attendreSucces: async () => {
    await screen.findByText(/transactions? importées?/)
  },
})