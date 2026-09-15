import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ObjectifsPage from './ObjectifsPage'

// `ObjectifsSuivisSection` a sa propre suite de tests (`ObjectifsSuivisSection.test.tsx`) :
// cette page ne fait que la monter, donc un double vide suffit ici.
vi.mock('../components/ObjectifsSuivisSection', () => ({
  default: () => <div data-testid="objectifs-suivis-section" />,
}))

describe('ObjectifsPage', () => {
  it('affiche le titre « Objectifs » et délègue aux objectifs suivis', () => {
    render(<ObjectifsPage />)

    expect(screen.getByRole('heading', { name: 'Objectifs' })).toBeInTheDocument()
    expect(screen.getByTestId('objectifs-suivis-section')).toBeInTheDocument()
  })
})
