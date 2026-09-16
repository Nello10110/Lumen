import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { PatrimoineHistoryPoint } from '../api/types'
import { useTendancePatrimoine } from './useTendancePatrimoine'

vi.mock('../api/client', () => ({
  api: {
    getPatrimoineHistory: vi.fn(),
  },
}))

function point(overrides: Partial<PatrimoineHistoryPoint> = {}): PatrimoineHistoryPoint {
  return {
    date: '2026-01-01',
    valeur_financiere: 0,
    valeur_manuelle: 0,
    actifs_totaux: 10000,
    passifs_totaux: 0,
    patrimoine_net: 10000,
    patrimoine_financier: 10000,
    valeur_investie: 0,
    valeur_investie_nette: 0,
    valeur_realisee_cumulee: 0,
    ...overrides,
  }
}

describe('useTendancePatrimoine (backlog § AG.5)', () => {
  it("ne consulte rien tant que active est false (avant qu'un user n'existe)", () => {
    renderHook(() => useTendancePatrimoine(false))
    expect(api.getPatrimoineHistory).not.toHaveBeenCalled()
  })

  it("'hausse' quand le dernier point dépasse le premier", async () => {
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue({
      points: [point({ patrimoine_net: 10000 }), point({ patrimoine_net: 12000 })],
    })
    const { result } = renderHook(() => useTendancePatrimoine(true))

    await waitFor(() => expect(result.current).toBe('hausse'))
  })

  it("'baisse' quand le dernier point est inférieur au premier", async () => {
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue({
      points: [point({ patrimoine_net: 10000 }), point({ patrimoine_net: 8000 })],
    })
    const { result } = renderHook(() => useTendancePatrimoine(true))

    await waitFor(() => expect(result.current).toBe('baisse'))
  })

  it('null quand la valeur est strictement inchangée (rien à raconter)', async () => {
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue({
      points: [point({ patrimoine_net: 10000 }), point({ patrimoine_net: 10000 })],
    })
    const { result } = renderHook(() => useTendancePatrimoine(true))

    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })

  it("null avec moins de deux points (pas assez d'historique pour une tendance)", async () => {
    vi.mocked(api.getPatrimoineHistory).mockResolvedValue({ points: [point()] })
    const { result } = renderHook(() => useTendancePatrimoine(true))

    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })

  it("null si l'appel échoue (repli sûr, jamais d'ambiance sur une donnée fausse)", async () => {
    vi.mocked(api.getPatrimoineHistory).mockRejectedValue(new Error('panne simulée'))
    const { result } = renderHook(() => useTendancePatrimoine(true))

    await waitFor(() => expect(api.getPatrimoineHistory).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })
})
