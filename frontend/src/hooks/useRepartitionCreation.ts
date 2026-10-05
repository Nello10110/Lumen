import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { QuotiteEntree } from '../api/types'
import {
  depuisQuotites,
  partsEgales,
  quotitesDepuis,
  totalValide,
  type Repartition,
} from '../utils/repartitionMembres'
import { useMembresFoyer } from './useMembresFoyer'

/** État de la répartition proposée à la création d'une ligne, d'un prêt ou d'un compte (§ BN.1,
 * lot 3), pour le bloc replié « Qui le détient » des formulaires d'ajout.
 *
 * Elle s'ouvre sur la règle du serveur : 100 % pour l'unique membre, parts égales à partir de deux,
 * ou — quand on ajoute une ligne à un compte dont toutes les lignes portent la même répartition —
 * celle de ce compte (`compteId`), tant que l'utilisateur n'y a pas touché. `quotites` est ce qu'il
 * faut envoyer : `undefined` quand le foyer n'a aucun membre lisible (le serveur décide), `[]` quand
 * l'utilisateur a mis toutes les parts à zéro (« ne pas répartir », en connaissance de cause). */
export function useRepartitionCreation(compteId: number | null = null) {
  const membres = useMembresFoyer()
  const [valeurs, setValeursBrut] = useState<Repartition>({})
  const [touchee, setTouchee] = useState(false)
  const ids = useMemo(() => (membres ?? []).map((m) => m.id), [membres])

  useEffect(() => {
    if (ids.length > 0) setValeursBrut((actuelles) => (Object.keys(actuelles).length > 0 ? actuelles : partsEgales(ids)))
  }, [ids])

  useEffect(() => {
    if (compteId === null || ids.length === 0 || touchee) return
    let actif = true
    api
      .getCompteQuotites(compteId)
      .then((r) => {
        if (actif && r.uniforme && r.quotites.length > 0) setValeursBrut(depuisQuotites(r.quotites))
      })
      .catch(() => undefined)
    return () => {
      actif = false
    }
  }, [compteId, ids, touchee])

  const setValeurs = useCallback((suivantes: Repartition) => {
    setValeursBrut(suivantes)
    setTouchee(true)
  }, [])

  const reinitialiser = useCallback(() => {
    setValeursBrut(ids.length > 0 ? partsEgales(ids) : {})
    setTouchee(false)
  }, [ids])

  const quotites: QuotiteEntree[] | undefined = ids.length > 0 ? quotitesDepuis(valeurs, ids) : undefined

  return { membres, valeurs, setValeurs, valide: totalValide(valeurs, ids), quotites, reinitialiser }
}
