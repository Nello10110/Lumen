import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { HoldingDetail } from '../api/types'

/** Charge la fiche détaillée d'une position, recharge si `holdingId` change ou via
 * `recharger()` (backlog 2.K.5 — action de reprise sur `EtatErreur` ; réutilisé
 * depuis le 17/09/2026 par `ClassificationParametresForm`, § AP.1, pour refléter
 * immédiatement un changement de géographie/secteur dans l'onglet Analyse de la
 * même fiche). Adressé par `holdingId` (revu le 14/09/2026) : deux lignes peuvent
 * désormais partager un ticker (une par compte) — seul l'id désigne sans
 * ambiguïté "de quelle ligne on parle".
 *
 * `detail` n'est remis à `null` QUE lorsque `holdingId` change lui-même (effet
 * séparé) — jamais sur un simple `recharger()` du même `holdingId` : sans cette
 * distinction, `HoldingDetailPage`/`HoldingDetailModal` (qui affichent un
 * squelette tant que `loading` est vrai) démontaient puis remontaient
 * `HoldingDetailContent` à chaque sauvegarde, perdant l'onglet actuellement
 * ouvert (retour à Aperçu après avoir enregistré depuis Paramètres, retour
 * utilisateur implicite constaté en vérifiant AP.1) — la fiche reste maintenant
 * affichée avec ses anciennes valeurs pendant qu'elle se rafraîchit en arrière-plan. */
export function useHoldingDetail(holdingId: number | undefined) {
  const [detail, setDetail] = useState<HoldingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [compteurRechargement, setCompteurRechargement] = useState(0)

  useEffect(() => {
    setDetail(null)
  }, [holdingId])

  useEffect(() => {
    if (holdingId === undefined) return
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
