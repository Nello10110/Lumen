import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { useMembresFoyer } from './useMembresFoyer'

vi.mock('../api/client', () => ({
  // `listDetenteurs` (gestion, propriétaire seul) est absent exprès : l'appeler ferait échouer le test.
  api: { listMembresFoyer: vi.fn() },
}))

beforeEach(() => vi.clearAllMocks())

describe('useMembresFoyer — lecture seule, ouverte aux trois rôles (§ BN.1, lot 3)', () => {
  it('vaut null pendant le chargement, puis la liste de la route de lecture (id et nom)', async () => {
    vi.mocked(api.listMembresFoyer).mockResolvedValue([
      { id: 1, nom: 'Alice' },
      { id: 2, nom: 'Bob' },
    ])
    const { result } = renderHook(() => useMembresFoyer())

    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toEqual([
      { id: 1, nom: 'Alice' },
      { id: 2, nom: 'Bob' },
    ]))
    expect(api.listMembresFoyer).toHaveBeenCalledTimes(1)
  })

  it('vaut [] quand la liste n’a pas pu être lue : les écrans s’effacent sans erreur', async () => {
    vi.mocked(api.listMembresFoyer).mockRejectedValue(new Error('panne réseau'))
    const { result } = renderHook(() => useMembresFoyer())

    await waitFor(() => expect(result.current).toEqual([]))
  })

  it('vaut [] pour un invité sans périmètre (le serveur renvoie une liste vide)', async () => {
    vi.mocked(api.listMembresFoyer).mockResolvedValue([])
    const { result } = renderHook(() => useMembresFoyer())

    await waitFor(() => expect(result.current).toEqual([]))
  })

  it('n’applique pas une réponse arrivée après le démontage', async () => {
    let repondre: (liste: { id: number; nom: string }[]) => void = () => {}
    vi.mocked(api.listMembresFoyer).mockReturnValue(new Promise((resolve) => (repondre = resolve)))
    const { result, unmount } = renderHook(() => useMembresFoyer())

    unmount()
    repondre([{ id: 1, nom: 'Alice' }])

    expect(result.current).toBeNull()
  })
})
