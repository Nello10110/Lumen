import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { HoldingDetail } from '../api/types'

/** Charge la fiche détaillée d'une position, recharge si `holdingId` change ou via
 * `recharger()` (backlog 2.K.5 — action de reprise sur `EtatErreur`). Adressé par
 * `holdingId` (revu le 14/09/2026) : deux lignes peuvent désormais partager un
 * ticker (une par compte) — seul l'id désigne sans ambiguïté "de quelle ligne on
 * parle". */
export function useHoldingDetail(holdingId: number | undefined) {
  const [detail, setDetail] = useState<HoldingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [compteurRechargement, setCompteurRechargement] = useState(0)

  useEffect(() => {
    if (holdingId === undefined) return
    setDetail(null)
    setLoading(true)
    setError(null)
    api
      .getHoldingDetail(holdingId)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [holdingId, compteurRechargement])

  return { detail, loading, error, recharger: () => setCompteurRechargement((n) => n + 1) }
}
