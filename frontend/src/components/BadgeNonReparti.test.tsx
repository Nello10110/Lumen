import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BadgeNonReparti from './BadgeNonReparti'

describe('BadgeNonReparti (§ BN.1, lot 3)', () => {
  it('affiche le badge « Non réparti » avec son infobulle explicative', () => {
    render(<BadgeNonReparti nom="PEA" />)

    const badge = screen.getByText('Non réparti')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('title', expect.stringContaining('pas de parts'))
  })

  it("sans onRepartir, il n'y a pas de lien « Répartir » (l'appelant ne sait pas ouvrir la répartition)", () => {
    render(<BadgeNonReparti nom="PEA" />)

    expect(screen.queryByRole('button', { name: /Répartir/ })).not.toBeInTheDocument()
  })

  it('avec onRepartir, le bouton « Répartir » est nommé d\'après la ligne et appelle onRepartir', () => {
    const onRepartir = vi.fn()
    render(<BadgeNonReparti nom="Livret A" onRepartir={onRepartir} />)

    fireEvent.click(screen.getByRole('button', { name: 'Répartir « Livret A » entre les membres du foyer' }))

    expect(onRepartir).toHaveBeenCalledTimes(1)
  })

  it("le clic sur « Répartir » n'ouvre pas la ligne qui le porte (propagation stoppée)", () => {
    const surLigne = vi.fn()
    const onRepartir = vi.fn()
    render(
      <div onClick={surLigne} onKeyDown={surLigne} role="presentation">
        <BadgeNonReparti nom="PEA" onRepartir={onRepartir} />
      </div>,
    )
    const bouton = screen.getByRole('button', { name: /Répartir/ })

    fireEvent.click(bouton)
    fireEvent.keyDown(bouton, { key: 'Enter' })

    expect(onRepartir).toHaveBeenCalledTimes(1)
    expect(surLigne).not.toHaveBeenCalled()
  })
})
