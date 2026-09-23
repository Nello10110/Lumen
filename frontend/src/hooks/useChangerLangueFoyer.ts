import { useCallback } from 'react'
import { api } from '../api/client'
import type { Langue } from '../i18n'
import { useAuth } from './useAuth'

/** Enregistre la langue du FOYER (réservé au propriétaire, backlog § BL), puis
 * recharge l'utilisateur : c'est `App.tsx`, en voyant la nouvelle `user.langue`, qui
 * passe l'interface dans cette langue — un seul chemin pour la connexion comme pour
 * un changement, jamais deux sources de vérité. */
export function useChangerLangueFoyer(): (langue: Langue) => Promise<void> {
  const { refetchUser } = useAuth()
  return useCallback(
    async (langue: Langue) => {
      await api.updateLangueFoyer(langue)
      await refetchUser()
    },
    [refetchUser],
  )
}
