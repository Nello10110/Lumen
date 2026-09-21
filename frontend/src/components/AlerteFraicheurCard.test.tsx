import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AlerteFraicheurItem } from '../api/types'
import AlerteFraicheurCard from './AlerteFraicheurCard'

vi.mock('../api/client', () => ({
  api: {
    getAlertesFraicheur: vi.fn(),
  },
}))

function alerte(overrides: Partial<AlerteFraicheurItem> = {}): AlerteFraicheurItem {
  return {
    holding_id: 1,
    nom: 'Résidence principale',
    type_actif_label: 'Immobilier',
    valeur_estimee: 250000,
    date_valeur_estimee: '2024-06-01',
    jours_depuis_maj: 400,
    ...overrides,
  }
}

describe('AlerteFraicheurCard', () => {
  it("ne rend rien si la liste est vide (rien à signaler)", async () => {
    vi.mocked(api.getAlertesFraicheur).mockResolvedValue([])
    const { container } = render(<AlerteFraicheurCard />)

    await vi.waitFor(() => expect(api.getAlertesFraicheur).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('ne rend rien tant que la requête est en cours', () => {
    vi.mocked(api.getAlertesFraicheur).mockReturnValue(new Promise(() => {}))
    const { container } = render(<AlerteFraicheurCard />)

    expect(container).toBeEmptyDOMElement()
  })

  it('affiche chaque ligne avec son nom, son libellé de type et son nombre de jours', async () => {
    vi.mocked(api.getAlertesFraicheur).mockResolvedValue([
      alerte(),
      alerte({ holding_id: 2, nom: 'Assurance-vie', type_actif_label: 'Assurance-vie', jours_depuis_maj: 900 }),
    ])
    render(<AlerteFraicheurCard />)

    await screen.findByText(/Résidence principale \(Immobilier\)/)
    expect(screen.getByText(/non mise à jour depuis le 01\/06\/2024 \(400 jours\)/)).toBeInTheDocument()
    expect(screen.getByText(/Assurance-vie \(Assurance-vie\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(900 jours\)/)).toBeInTheDocument()
  })

  it('ne rend rien en cas de panne réseau', async () => {
    vi.mocked(api.getAlertesFraicheur).mockRejectedValue(new Error('panne simulée'))
    const { container } = render(<AlerteFraicheurCard />)

    await vi.waitFor(() => expect(api.getAlertesFraicheur).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
