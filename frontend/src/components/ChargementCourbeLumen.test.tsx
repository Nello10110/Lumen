import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ChargementCourbeLumen from './ChargementCourbeLumen'

describe('ChargementCourbeLumen', () => {
  it("expose un rôle status avec un libellé accessible, pour qu'un lecteur d'écran annonce l'attente", () => {
    render(<ChargementCourbeLumen />)

    expect(screen.getByRole('status', { name: "Chargement de l'historique en cours" })).toBeInTheDocument()
  })

  it('affiche le clin d\'œil Lumen', () => {
    render(<ChargementCourbeLumen />)

    expect(screen.getByText(/Lumen fait la lumière sur votre historique/)).toBeInTheDocument()
  })

  it('respecte la hauteur personnalisée (évite un saut de mise en page à l\'arrivée des données)', () => {
    render(<ChargementCourbeLumen hauteur={200} />)

    expect(screen.getByRole('status')).toHaveStyle({ height: '200px' })
  })
})
