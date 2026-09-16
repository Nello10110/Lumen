import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PreferencesAffichageContext } from '../contexts/preferencesAffichageContextObject'
import LabelAdaptatif from './LabelAdaptatif'

function renderAvec(langageSimple: boolean) {
  return render(
    <PreferencesAffichageContext.Provider
      value={{
        lentille: 'net',
        setLentille: vi.fn(),
        montantsMasques: false,
        toggleMontantsMasques: vi.fn(),
        detenteurId: null,
        setDetenteurId: vi.fn(),
        periode: { type: 'relative', valeur: 'TOUT' },
        setPeriode: vi.fn(),
        langageSimple,
        toggleLangageSimple: vi.fn(),
      }}
    >
      <LabelAdaptatif simple="Régularité du parcours" technique="Volatilité annualisée" />
    </PreferencesAffichageContext.Provider>,
  )
}

describe('LabelAdaptatif (backlog § AG.1)', () => {
  it('affiche le terme technique, sans bouton, quand la préférence est désactivée', () => {
    renderAvec(false)

    expect(screen.getByText('Volatilité annualisée')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('affiche le libellé simple avec un lien « terme technique » quand la préférence est activée', () => {
    renderAvec(true)

    expect(screen.getByText('Régularité du parcours')).toBeInTheDocument()
    expect(screen.queryByText('Volatilité annualisée')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'terme technique' })).toBeInTheDocument()
  })

  it('déplie le terme technique au clic, puis peut revenir au langage simple', () => {
    renderAvec(true)

    fireEvent.click(screen.getByRole('button', { name: 'terme technique' }))
    expect(screen.getByText('Volatilité annualisée')).toBeInTheDocument()
    expect(screen.queryByText('Régularité du parcours')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'langage simple' }))
    expect(screen.getByText('Régularité du parcours')).toBeInTheDocument()
  })
})
