import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DernierImport } from '../api/types'
import { sourceImportParCle } from '../utils/guidesExport'
import TuileSourceImport from './TuileSourceImport'

vi.mock('../api/client', () => ({
  api: {
    getLogosEtablissements: vi.fn().mockResolvedValue({}),
    getLogosCatalogue: vi.fn().mockResolvedValue({}),
  },
}))

function renderTuile(overrides: {
  dernierImport?: DernierImport | null
  active?: boolean
  onFichier?: (f: File) => void
} = {}) {
  const onFichier = overrides.onFichier ?? vi.fn()
  render(
    <TuileSourceImport
      source={sourceImportParCle('ledger')}
      dernierImport={overrides.dernierImport ?? null}
      active={overrides.active ?? false}
      onFichier={onFichier}
    />,
  )
  return { onFichier }
}

describe('TuileSourceImport (refonte de l\'écran Import, 22/09/2026)', () => {
  it('remonte le fichier déposé au parent, qui décide quel panneau ouvrir', () => {
    const { onFichier } = renderTuile()

    const f = new File(['x'], 'operations.csv', { type: 'text/csv' })
    fireEvent.change(screen.getByTestId('dropzone-input-Importer depuis Ledger'), { target: { files: [f] } })

    expect(onFichier).toHaveBeenCalledWith(f)
  })

  it("vide l'input après le dépôt, pour que redéposer le MÊME fichier redéclenche un import", () => {
    const { onFichier } = renderTuile()
    const input = screen.getByTestId('dropzone-input-Importer depuis Ledger') as HTMLInputElement
    const f = new File(['x'], 'operations.csv', { type: 'text/csv' })

    fireEvent.change(input, { target: { files: [f] } })

    expect(onFichier).toHaveBeenCalledTimes(1)
    expect(input.value).toBe('')
  })

  it("le bouton d'aide n'ouvre PAS le sélecteur de fichier en même temps que le guide", () => {
    // Le bouton est un frère de la zone de dépôt, pas un enfant : son clic ne doit
    // pas remonter jusqu'au `role="button"` de la zone (cf. docstring du composant).
    const { onFichier } = renderTuile()
    const clic = vi.fn()
    ;(screen.getByTestId('dropzone-input-Importer depuis Ledger') as HTMLInputElement).click = clic

    fireEvent.click(screen.getByRole('button', { name: 'Comment exporter depuis Ledger ?' }))

    expect(screen.getByText('Exporter depuis Ledger')).toBeInTheDocument()
    expect(clic).not.toHaveBeenCalled()
    expect(onFichier).not.toHaveBeenCalled()
  })

  it('affiche les étapes du guide dans l\'ordre, numérotées', () => {
    renderTuile()

    fireEvent.click(screen.getByRole('button', { name: 'Comment exporter depuis Ledger ?' }))

    const etapes = sourceImportParCle('ledger').guide.etapes
    for (const etape of etapes) {
      expect(screen.getByText(etape)).toBeInTheDocument()
    }
    expect(screen.getByText(etapes.length.toString())).toBeInTheDocument()
  })

  it('« Jamais importé » tant que la source n\'a pas de trace', () => {
    renderTuile({ dernierImport: null })

    expect(screen.getByText('Jamais importé')).toBeInTheDocument()
  })

  it('accorde « ligne » au singulier pour un import d\'une seule ligne', () => {
    renderTuile({ dernierImport: { source: 'ledger', importe_le: '2026-09-14T08:30:00', nb_lignes: 1 } })

    expect(screen.getByText(/14\/09\/2026 · 1 ligne$/)).toBeInTheDocument()
  })
})
