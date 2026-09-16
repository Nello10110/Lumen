import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { EtatRafraichissement } from '../api/types'
import { RafraichissementCoursProvider } from '../contexts/RafraichissementCoursContext'
import { useRafraichissementCours } from '../hooks/useRafraichissementCours'
import RafraichissementCoursIndicateur from './RafraichissementCoursIndicateur'

vi.mock('../api/client', () => ({
  api: {
    getRefreshStatus: vi.fn(),
  },
}))

function etat(overrides: Partial<EtatRafraichissement> = {}): EtatRafraichissement {
  return {
    en_cours: false,
    positions_traitees: 0,
    positions_total: 0,
    demarre_le: null,
    termine_le: null,
    statut: null,
    message: null,
    ...overrides,
  }
}

// Composant qui déclenche un rafraîchissement à la demande — simule le bouton
// « Rafraîchir les cours » d'un écran quelconque, indépendant de l'indicateur.
function Declencheur() {
  const { declencher } = useRafraichissementCours()
  return (
    <button type="button" onClick={() => void declencher(() => Promise.resolve())}>
      Rafraîchir
    </button>
  )
}

function ArbreDeTest() {
  return (
    <RafraichissementCoursProvider>
      <Declencheur />
      <RafraichissementCoursIndicateur />
    </RafraichissementCoursProvider>
  )
}

describe('RafraichissementCoursIndicateur', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it("n'affiche rien tant qu'aucun rafraîchissement n'a jamais été déclenché", () => {
    render(<ArbreDeTest />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('affiche la progression pendant un rafraîchissement en cours', async () => {
    vi.mocked(api.getRefreshStatus).mockResolvedValueOnce(
      etat({ en_cours: true, positions_traitees: 1, positions_total: 5 }),
    )
    render(<ArbreDeTest />)

    await act(async () => {
      screen.getByRole('button', { name: 'Rafraîchir' }).click()
    })

    expect(screen.getByRole('status')).toHaveTextContent('1 / 5')
  })

  it('affiche « Cours à jour » à la fin, puis disparaît tout seul après quelques secondes', async () => {
    vi.mocked(api.getRefreshStatus).mockResolvedValueOnce(etat({ statut: 'ok', termine_le: '2026-09-16T10:00:00Z' }))
    render(<ArbreDeTest />)

    await act(async () => {
      screen.getByRole('button', { name: 'Rafraîchir' }).click()
    })

    expect(screen.getByRole('status')).toHaveTextContent('Cours à jour.')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it("affiche l'échec avec le message renvoyé par le backend", async () => {
    vi.mocked(api.getRefreshStatus).mockResolvedValueOnce(
      etat({ statut: 'erreur', message: 'panne simulée', termine_le: '2026-09-16T10:00:00Z' }),
    )
    render(<ArbreDeTest />)

    await act(async () => {
      screen.getByRole('button', { name: 'Rafraîchir' }).click()
    })

    expect(screen.getByRole('status')).toHaveTextContent('panne simulée')
  })
})
