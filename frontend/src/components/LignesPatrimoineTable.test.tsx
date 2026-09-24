import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { LignePatrimoineFiltree } from '../api/types'
import LignesPatrimoineTable from './LignesPatrimoineTable'

vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ lentille: 'net', setLentille: vi.fn(), montantsMasques: false, toggleMontantsMasques: vi.fn() }),
}))

function ligne(overrides: Partial<LignePatrimoineFiltree> = {}): LignePatrimoineFiltree {
  return {
    holding_id: 1,
    ticker: 'MAISON',
    nom: 'Maison',
    type_actif_label: 'Immobilier',
    compte_nom: null,
    etablissement_nom: null,
    quantite: 1,
    valeur: 300000,
    valeur_nette: 180000,
    quotite_pct: null,
    ...overrides,
  }
}

describe('LignesPatrimoineTable', () => {
  it("affiche un état vide quand aucune ligne ne correspond aux filtres", () => {
    render(<LignesPatrimoineTable lignes={[]} lentille="brut" detenteurFiltre={false} />)
    expect(screen.getByText('Aucune ligne pour cette combinaison de filtres.')).toBeInTheDocument()
  })

  it('affiche la valeur BRUTE en lentille brut', () => {
    render(<LignesPatrimoineTable lignes={[ligne()]} lentille="brut" detenteurFiltre={false} />)
    expect(screen.getByText('Maison')).toBeInTheDocument()
    // Ligne ET total affichent la même valeur ici (une seule ligne) : les deux
    // occurrences sont attendues.
    expect(screen.getAllByText('300 000 €')).toHaveLength(2)
  })

  it('affiche la valeur NETTE (moins emprunt rattaché) en lentille net', () => {
    render(<LignesPatrimoineTable lignes={[ligne()]} lentille="net" detenteurFiltre={false} />)
    expect(screen.getAllByText('180 000 €')).toHaveLength(2)
  })

  it("n'affiche la colonne Quote-part que si un détenteur est filtré", () => {
    const { rerender } = render(<LignesPatrimoineTable lignes={[ligne({ quotite_pct: 60 })]} lentille="brut" detenteurFiltre={false} />)
    expect(screen.queryByText('Quote-part')).not.toBeInTheDocument()

    rerender(<LignesPatrimoineTable lignes={[ligne({ quotite_pct: 60 })]} lentille="brut" detenteurFiltre={true} />)
    expect(screen.getByText('Quote-part')).toBeInTheDocument()
    expect(screen.getByText('60,0 %')).toBeInTheDocument()
  })

  it('additionne le total de la colonne affichée', () => {
    render(
      <LignesPatrimoineTable
        lignes={[ligne({ holding_id: 1, valeur: 100 }), ligne({ holding_id: 2, ticker: 'AAA', nom: 'AAA', valeur: 200 })]}
        lentille="brut"
        detenteurFiltre={false}
      />,
    )
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('300 €')).toBeInTheDocument()
  })

  it('affiche le ticker si aucun nom n\'est renseigné', () => {
    render(<LignesPatrimoineTable lignes={[ligne({ nom: null, ticker: 'AAA' })]} lentille="brut" detenteurFiltre={false} />)
    expect(screen.getByText('AAA')).toBeInTheDocument()
  })
})
