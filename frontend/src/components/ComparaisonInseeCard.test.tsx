import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { ComparaisonInsee } from '../api/types'
import ComparaisonInseeCard from './ComparaisonInseeCard'

vi.mock('../api/client', () => ({
  api: {
    getComparaisonInsee: vi.fn(),
  },
}))

function comparaison(overrides: Partial<ComparaisonInsee> = {}): ComparaisonInsee {
  return {
    actifs_totaux_foyer: 200_000,
    mediane_reference: 215_200,
    ecart_pct: -7.1,
    age_utilise: 45,
    source: 'INSEE, Histoire de vie et Patrimoine 2023-2024 (Insee Focus n° 371)',
    ...overrides,
  }
}

describe('ComparaisonInseeCard', () => {
  it("ne rend rien si l'API renvoie null (année de naissance non renseignée)", async () => {
    vi.mocked(api.getComparaisonInsee).mockResolvedValue(null)
    const { container } = render(<ComparaisonInseeCard />)

    await vi.waitFor(() => expect(api.getComparaisonInsee).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('ne rend rien tant que la requête est en cours', () => {
    vi.mocked(api.getComparaisonInsee).mockReturnValue(new Promise(() => {}))
    const { container } = render(<ComparaisonInseeCard />)

    expect(container).toBeEmptyDOMElement()
  })

  // Écart au format de la langue depuis le multilingue (§ BL) : « 12,5 % » en
  // français — l'ancien « 12.5 % » portait un point décimal anglais.
  it('affiche "au-dessus" quand ecart_pct est positif', async () => {
    vi.mocked(api.getComparaisonInsee).mockResolvedValue(comparaison({ ecart_pct: 12.5 }))
    render(<ComparaisonInseeCard />)

    await screen.findByText('Vous êtes 12,5 % au-dessus de cette médiane.')
  })

  it('affiche "en-dessous" quand ecart_pct est négatif', async () => {
    vi.mocked(api.getComparaisonInsee).mockResolvedValue(comparaison({ ecart_pct: -7.1 }))
    render(<ComparaisonInseeCard />)

    await screen.findByText('Vous êtes 7,1 % en-dessous de cette médiane.')
  })

  it('mentionne la source et "patrimoine brut"', async () => {
    vi.mocked(api.getComparaisonInsee).mockResolvedValue(comparaison())
    render(<ComparaisonInseeCard />)

    await screen.findByText(/Patrimoine brut, hors emprunts déduits\. Source :/)
  })
})
