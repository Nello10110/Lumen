import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { MembreFoyer } from '../api/types'

/** Les membres du foyer que ce compte peut voir, chargés une fois par composant (§ BN.1, lot 3) :
 * tous pour le propriétaire et le membre, ceux de son périmètre pour un invité. `null` pendant le
 * chargement ; `[]` si le foyer n'en a aucun, si l'invité n'a aucun périmètre OU si la liste n'a pas
 * pu être lue — les écrans qui en dépendent s'effacent alors, au lieu d'afficher une erreur que cet
 * utilisateur ne peut pas corriger. */
export function useMembresFoyer(): MembreFoyer[] | null {
  const [membres, setMembres] = useState<MembreFoyer[] | null>(null)
  useEffect(() => {
    let actif = true
    api
      .listMembresFoyer()
      .then((liste) => actif && setMembres(liste))
      .catch(() => actif && setMembres([]))
    return () => {
      actif = false
    }
  }, [])
  return membres
}
