import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ValuationHistoryPoint } from '../api/types'

/** Historique daté des valorisations manuelles d'une ligne (backlog 2.M.3, 2.S.1) — alimente
 * l'Aperçu d'un bien immobilier et d'une ligne d'épargne. Il vivait avec le formulaire de la
 * fiche immobilière (`useImmobilierDetail`) ; celui-ci a ses propres états depuis le lot 2 du
 * § BN.1 (`ImmobilierParametresForm`), et il ne restait ici que cette lecture.
 *
 * `charger` désactive la requête pour toute ligne qui n'est ni un bien immobilier ni de
 * l'épargne (l'historique daté n'est pas réservé à l'immobilier malgré son origine). Adressé
 * par `holdingId` (revu le 14/09/2026), pas par ticker — cf. `client.ts`. */
export function useHistoriqueValorisation(holdingId: number, charger: boolean) {
  const [historique, setHistorique] = useState<ValuationHistoryPoint[]>([])

  const rechargerHistorique = () => {
    api
      .getHoldingValuationHistory(holdingId)
      .then(setHistorique)
      .catch(() => setHistorique([]))
  }

  useEffect(() => {
    if (!charger) return
    rechargerHistorique()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `holdingId` change = remontage du composant parent (route/modale).
  }, [holdingId, charger])

  return { historique, rechargerHistorique }
}
