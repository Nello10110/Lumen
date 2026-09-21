import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur, QuotiteDetenteurItem } from '../api/types'
import DetenteursSection from './DetenteursSection'

vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
    setHoldingQuotites: vi.fn(),
    getHoldingDetail: vi.fn(),
  },
}))

vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ lentille: 'net', setLentille: vi.fn(), montantsMasques: false, toggleMontantsMasques: vi.fn() }),
}))

const DETENTEURS: Detenteur[] = [
  { id: 1, nom: 'Alice', created_at: '2020-01-01T00:00:00', updated_at: '2020-01-01T00:00:00' },
  { id: 2, nom: 'Bob', created_at: '2020-01-01T00:00:00', updated_at: '2020-01-01T00:00:00' },
]

const QUOTITES: QuotiteDetenteurItem[] = [
  { detenteur_id: 1, detenteur_nom: 'Alice', quotite_pct: 60, part_detenue: 180000, part_nette: 180000 },
  { detenteur_id: 2, detenteur_nom: 'Bob', quotite_pct: 40, part_detenue: 120000, part_nette: 120000 },
]

describe('DetenteursSection', () => {
  it("l'en-tête « Quotité » porte une infobulle explicative (backlog § AZ.3)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue(DETENTEURS)
    render(<DetenteursSection holdingId={1} quotitesInitiales={QUOTITES} />)

    // `InfoBulle` reste `aria-hidden`, sans texte propre : le nom accessible de
    // l'en-tête doit continuer à matcher exactement "Quotité", sans que
    // l'infobulle ne s'y ajoute.
    const entete = await screen.findByRole('columnheader', { name: 'Quotité' })
    expect(entete.querySelector('[title]')).toHaveAttribute(
      'title',
      "La part du gâteau qui revient à chaque personne sur ce bien ou cet emprunt. La somme des quotités d'une ligne fait toujours 100 %.",
    )
  })
})
