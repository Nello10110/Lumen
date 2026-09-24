import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { IndicateursSituation } from '../api/types'
import IndicateursSituationCard from './IndicateursSituationCard'

vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ montantsMasques: false }),
}))

function indicateurs(overrides: Partial<IndicateursSituation> = {}): IndicateursSituation {
  return {
    matelas_securite_mois: 6,
    taux_endettement_pct: 25,
    part_immobilisee_pct: 40,
    epargne_disponible: 12000,
    depenses_mensuelles_moyennes: 2000,
    mensualites_totales: 500,
    revenus_nets_mensuels_moyens: 2000,
    ...overrides,
  }
}

describe('IndicateursSituationCard (backlog 2.O.2)', () => {
  it('affiche les trois indicateurs quand les données sont disponibles', () => {
    render(<IndicateursSituationCard indicateurs={indicateurs()} />)

    expect(screen.getByText('6 mois')).toBeInTheDocument()
    expect(screen.getByText('+25,0 %')).toBeInTheDocument()
    expect(screen.getByText('+40,0 %')).toBeInTheDocument()
    expect(screen.queryByText(/Nécessite des mouvements bancaires/)).not.toBeInTheDocument()
  })

  it("affiche un repli explicatif quand le budget n'est pas encore assez rempli", () => {
    render(<IndicateursSituationCard indicateurs={indicateurs({ matelas_securite_mois: null, taux_endettement_pct: null })} />)

    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.getByText(/Nécessite des mouvements bancaires/)).toBeInTheDocument()
  })
})
