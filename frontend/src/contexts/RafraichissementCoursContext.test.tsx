import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { EtatRafraichissement } from '../api/types'
import { useRafraichissementCours } from '../hooks/useRafraichissementCours'
import { RafraichissementCoursProvider } from './RafraichissementCoursContext'

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

type Valeurs = ReturnType<typeof useRafraichissementCours>

// Expose l'état courant d'une instance du hook à l'extérieur du rendu React, sans
// passer par `renderHook` (qui monterait sa PROPRE arborescence, donc son propre
// Provider — inutile pour ces tests, qui veulent au contraire UN SEUL Provider
// partagé par plusieurs « pages » simulées, montées/démontées tour à tour).
function Sonde({ onExpose, onTermine }: { onExpose: (v: Valeurs) => void; onTermine?: (e: EtatRafraichissement) => void }) {
  const valeurs = useRafraichissementCours(onTermine)
  onExpose(valeurs)
  return null
}

describe('RafraichissementCoursProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it(
    "survit à la navigation : le composant qui démonte (changement de page) n'interrompt pas le " +
      "sondage porté par le Provider — resté monté une seule fois, comme dans App.tsx — et un " +
      "composant monté ensuite voit l'état déjà en cours plutôt que de repartir de zéro " +
      '(retour utilisateur du 16/09/2026 — « il faut que ça continue quand on change de page »)',
    async () => {
      vi.mocked(api.getRefreshStatus)
        .mockResolvedValueOnce(etat({ en_cours: true, positions_traitees: 0, positions_total: 2 }))
        .mockResolvedValueOnce(etat({ en_cours: true, positions_traitees: 1, positions_total: 2 }))
        .mockResolvedValueOnce(
          etat({ en_cours: false, positions_traitees: 2, positions_total: 2, statut: 'ok', termine_le: '2026-09-16T10:00:00Z' }),
        )

      let valeursPage1: Valeurs | null = null
      let valeursPage2: Valeurs | null = null

      const { rerender } = render(
        <RafraichissementCoursProvider>
          <Sonde onExpose={(v) => (valeursPage1 = v)} />
        </RafraichissementCoursProvider>,
      )

      await act(async () => {
        await valeursPage1!.declencher(() => Promise.resolve())
      })
      expect(valeursPage1!.enCours).toBe(true)

      // L'utilisateur change de page : le composant qui a déclenché le
      // rafraîchissement démonte (le Provider, lui, reste monté — comme dans
      // App.tsx, où il enveloppe TOUTES les routes authentifiées).
      rerender(<RafraichissementCoursProvider>{null}</RafraichissementCoursProvider>)

      // Le sondage doit continuer malgré tout : encore un appel après le délai
      // habituel, alors que plus aucun composant de la « page précédente » n'est monté.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })
      expect(api.getRefreshStatus).toHaveBeenCalledTimes(2)

      // Une « nouvelle page » se monte pendant que le rafraîchissement tourne encore
      // : elle doit voir l'état déjà en cours, pas repartir de zéro.
      rerender(
        <RafraichissementCoursProvider>
          <Sonde onExpose={(v) => (valeursPage2 = v)} />
        </RafraichissementCoursProvider>,
      )
      expect(valeursPage2!.enCours).toBe(true)
      expect(valeursPage2!.etat?.positions_traitees).toBe(1)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })
      expect(api.getRefreshStatus).toHaveBeenCalledTimes(3)
      expect(valeursPage2!.enCours).toBe(false)
      expect(valeursPage2!.etat?.statut).toBe('ok')
    },
  )

  it('plusieurs consommateurs montés en même temps (ex. 5 JobCard de Réglages) partagent la même instance de moteur', async () => {
    let valeursA: Valeurs | null = null
    let valeursB: Valeurs | null = null

    render(
      <RafraichissementCoursProvider>
        <Sonde onExpose={(v) => (valeursA = v)} />
        <Sonde onExpose={(v) => (valeursB = v)} />
      </RafraichissementCoursProvider>,
    )

    vi.mocked(api.getRefreshStatus).mockResolvedValueOnce(etat({ en_cours: true, positions_traitees: 0, positions_total: 1 }))
    await act(async () => {
      await valeursA!.declencher(() => Promise.resolve())
    })

    // Déclenché depuis « A », immédiatement visible côté « B » : même instance
    // d'état, pas une copie indépendante par composant.
    expect(valeursB!.enCours).toBe(true)
    expect(valeursB!.etat?.positions_total).toBe(1)
  })

  it("un consommateur monté APRÈS la fin d'un rafraîchissement ne rejoue pas onTermine pour cet événement déjà ancien", async () => {
    vi.mocked(api.getRefreshStatus).mockResolvedValueOnce(
      etat({ en_cours: false, statut: 'ok', termine_le: '2026-09-16T09:00:00Z' }),
    )

    let valeursPage1: Valeurs | null = null
    const { rerender } = render(
      <RafraichissementCoursProvider>
        <Sonde onExpose={(v) => (valeursPage1 = v)} />
      </RafraichissementCoursProvider>,
    )
    await act(async () => {
      await valeursPage1!.declencher(() => Promise.resolve())
    })
    expect(valeursPage1!.etat?.statut).toBe('ok')

    // Un nouvel écran (ex. Réglages) se monte APRÈS coup, sur le même Provider —
    // il recharge de toute façon ses propres données à son montage (`ReglagesPage`
    // appelle `listJobs()` dans son propre effet), inutile de rejouer `onTermine`
    // pour une fin déjà ancienne.
    const onTermine = vi.fn()
    rerender(
      <RafraichissementCoursProvider>
        <Sonde onExpose={() => {}} onTermine={onTermine} />
      </RafraichissementCoursProvider>,
    )

    expect(onTermine).not.toHaveBeenCalled()
  })
})
