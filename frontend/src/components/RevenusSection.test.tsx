import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { DividendeMois } from '../api/types'
import RevenusSection from './RevenusSection'

vi.mock('../api/client', () => ({
  api: {
    getDividendCalendar: vi.fn(),
  },
}))

// Revenus passifs (loyers, intérêts d'épargne) : carte autonome avec ses propres
// appels API, hors de l'objet de ce fichier.
vi.mock('./RevenusPassifsCard', () => ({ default: () => <div /> }))

vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ montantsMasques: false }),
}))

function mois(libelle: string, montant = 10): DividendeMois {
  return {
    mois: libelle,
    montant_total: montant,
    lignes: [{ date: `${libelle}-15`, nom: 'Action Test', symbol: 'AAA', montant }],
  }
}

// 7 mois consécutifs, ordre chronologique croissant (même ordre que l'API) —
// `RevenusSection` les affiche du plus récent au plus ancien.
const SEPT_MOIS = Array.from({ length: 7 }, (_, i) => mois(`2026-${String(i + 1).padStart(2, '0')}`))

describe('RevenusSection — repli du détail des dividendes (retour utilisateur du 21/09/2026)', () => {
  it("n'affiche aucun bouton quand il y a 5 mois ou moins", async () => {
    vi.mocked(api.getDividendCalendar).mockResolvedValue(SEPT_MOIS.slice(0, 5))
    render(<RevenusSection />)

    await screen.findByText('Détail des dividendes')
    expect(screen.queryByRole('button', { name: /Afficher/ })).not.toBeInTheDocument()
  })

  it('affiche seulement les 5 mois les plus récents par défaut, avec un bouton pour le reste', async () => {
    vi.mocked(api.getDividendCalendar).mockResolvedValue(SEPT_MOIS)
    render(<RevenusSection />)

    // Le plus récent (2026-07) doit être visible, les deux plus anciens (01, 02) masqués.
    await screen.findByText('Juillet 2026')
    expect(screen.getByText('Mars 2026')).toBeInTheDocument()
    expect(screen.queryByText('Février 2026')).not.toBeInTheDocument()
    expect(screen.queryByText('Janvier 2026')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Afficher les 2 mois précédents' })).toBeInTheDocument()
  })

  it('le bouton révèle les mois restants puis se change en « Réduire »', async () => {
    vi.mocked(api.getDividendCalendar).mockResolvedValue(SEPT_MOIS)
    render(<RevenusSection />)
    await screen.findByText('Juillet 2026')

    fireEvent.click(screen.getByRole('button', { name: 'Afficher les 2 mois précédents' }))

    expect(screen.getByText('Février 2026')).toBeInTheDocument()
    expect(screen.getByText('Janvier 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réduire' })).toBeInTheDocument()
  })

  it('« Réduire » remasque les mois les plus anciens', async () => {
    vi.mocked(api.getDividendCalendar).mockResolvedValue(SEPT_MOIS)
    render(<RevenusSection />)
    await screen.findByText('Juillet 2026')

    fireEvent.click(screen.getByRole('button', { name: 'Afficher les 2 mois précédents' }))
    fireEvent.click(screen.getByRole('button', { name: 'Réduire' }))

    expect(screen.queryByText('Janvier 2026')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Afficher les 2 mois précédents' })).toBeInTheDocument()
  })
})
