import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Detenteur } from '../api/types'

/** Les membres du foyer, chargés une fois par composant (§ BN.1, lot 3). `null` pendant le
 * chargement ; `[]` si le foyer n'en a aucun OU si la liste n'est pas lisible par ce compte (elle
 * est réservée au propriétaire) — les écrans qui en dépendent s'effacent alors, au lieu d'afficher
 * une erreur que cet utilisateur ne peut pas corriger. */
export function useMembresFoyer(): Detenteur[] | null {
  const [membres, setMembres] = useState<Detenteur[] | null>(null)
  useEffect(() => {
    let actif = true
    api
      .listDetenteurs()
      .then((liste) => actif && setMembres(liste))
      .catch(() => actif && setMembres([]))
    return () => {
      actif = false
    }
  }, [])
  return membres
}
