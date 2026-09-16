import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EtatVide from './EtatVide'

describe('EtatVide', () => {
  it('affiche le titre seul par défaut', () => {
    const { container } = render(<EtatVide titre="Rien à afficher." />)

    expect(screen.getByText('Rien à afficher.')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('affiche la description quand elle est fournie', () => {
    render(<EtatVide titre="Rien à afficher." description="Essaie autre chose." />)

    expect(screen.getByText('Essaie autre chose.')).toBeInTheDocument()
  })

  // Backlog § AG.8 (16/09/2026) : illustration facultative, réservée au tout
  // premier état vide d'un écran (celui qui invite à commencer) — jamais posée
  // par défaut, pour ne pas alourdir les états vides secondaires (filtres sans
  // résultat...).
  it("n'affiche aucune illustration par défaut, même avec une description", () => {
    const { container } = render(<EtatVide titre="Aucun résultat pour ce filtre." description="Réinitialiser" />)

    expect(container.querySelector('svg')).toBeNull()
  })

  it('affiche l\'illustration (logo Lumen très pâle) quand demandée explicitement', () => {
    const { container } = render(<EtatVide titre="Ajoutez votre première ligne." illustration />)

    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('class')).toContain('opacity-[0.08]')
  })
})
