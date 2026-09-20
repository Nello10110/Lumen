import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { ScorePatrimonial } from '../api/types'
import ScorePatrimonialCard from './ScorePatrimonialCard'

vi.mock('../api/client', () => ({
  api: {
    getScorePatrimonial: vi.fn(),
  },
}))

function score(overrides: Partial<ScorePatrimonial> = {}): ScorePatrimonial {
  return {
    score_global: 67,
    sous_scores: [
      {
        id: 'diversification',
        label: 'Diversification par classe d\'actif',
        score: 48,
        poids_pct: 40,
        explication: 'Explication diversification',
      },
      {
        id: 'qualite_donnees',
        label: 'Qualité des données du portefeuille financier',
        score: 100,
        poids_pct: 30,
        explication: 'Explication qualité',
      },
      {
        id: 'endettement',
        label: 'Endettement',
        score: 60,
        poids_pct: 30,
        explication: 'Explication endettement',
      },
    ],
    ...overrides,
  }
}

describe('ScorePatrimonialCard', () => {
  it('affiche un squelette pendant le chargement', () => {
    vi.mocked(api.getScorePatrimonial).mockReturnValue(new Promise(() => {}))
    const { container } = render(<ScorePatrimonialCard />)

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it("affiche EtatErreur + Réessayer si l'appel échoue, puis le score une fois relancé", async () => {
    vi.mocked(api.getScorePatrimonial).mockRejectedValueOnce(new Error('panne simulée'))
    render(<ScorePatrimonialCard />)

    await screen.findByText('panne simulée')
    const bouton = screen.getByRole('button', { name: 'Réessayer' })

    vi.mocked(api.getScorePatrimonial).mockResolvedValueOnce(score())
    fireEvent.click(bouton)

    await screen.findByText('67/100')
  })

  it('affiche le score global et déplie le détail des sous-scores', async () => {
    vi.mocked(api.getScorePatrimonial).mockResolvedValue(score())
    render(<ScorePatrimonialCard />)

    await screen.findByText('67/100')
    // Le détail existe dans le DOM (élément <details>) mais son contenu textuel
    // n'est visible qu'une fois déplié — pas besoin de simuler le clic sur <summary>
    // pour vérifier sa présence, `getByText` cherche dans tout le DOM y compris fermé.
    expect(screen.getByText('Explication diversification')).toBeInTheDocument()
    expect(screen.getByText('Explication qualité')).toBeInTheDocument()
    expect(screen.getByText('Explication endettement')).toBeInTheDocument()
  })

  it('ne montre aucune ligne fantôme quand la qualité des données est exclue', async () => {
    vi.mocked(api.getScorePatrimonial).mockResolvedValue(
      score({
        score_global: 43,
        sous_scores: [
          { id: 'diversification', label: "Diversification par classe d'actif", score: 0, poids_pct: 40, explication: 'x' },
          { id: 'endettement', label: 'Endettement', score: 100, poids_pct: 30, explication: 'y' },
        ],
      }),
    )
    render(<ScorePatrimonialCard />)

    await screen.findByText('43/100')
    expect(screen.queryByText(/qualité/i)).not.toBeInTheDocument()
  })
})
