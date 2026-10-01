import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { OidcStatus } from '../api/types'
import { useAuth } from './useAuth'

/** Liaison du compte connecté à son identité SSO (backlog § BK.2d) : la logique commune de la
 * carte de Réglages (`LiaisonSsoCard`, propriétaire) et de la fenêtre du menu du compte
 * (`LiaisonSsoModale`, membre ou invité, qui n'ont pas Réglages).
 *
 * `actif` faux : aucun appel, `disponible` reste faux — le propriétaire a la carte, son menu du
 * compte n'a pas à interroger le serveur pour rien. `disponible` : le SSO est configuré et le
 * compte n'est pas un opérateur (mot de passe seulement).
 *
 * `lier` demande l'adresse d'autorisation du fournisseur puis y envoie le navigateur ; le retour
 * est traité par `useRetourLiaisonSso`. `delier` retire l'identité (409 sans mot de passe : le
 * message du serveur est affiché) puis recharge l'utilisateur (`sso_lie`). */
export function useLiaisonSso(actif = true) {
  const { user, refetchUser } = useAuth()
  const [sso, setSso] = useState<OidcStatus | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!actif) return
    api
      .getOidcStatus()
      .then(setSso)
      .catch(() => setSso(null))
  }, [actif])

  async function lier() {
    setEnCours(true)
    setErreur(null)
    try {
      const { url } = await api.lierSso()
      window.location.assign(url)
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  async function delier() {
    setEnCours(true)
    setErreur(null)
    try {
      await api.delierSso()
      await refetchUser()
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  return {
    disponible: actif && !!user && !user.est_operateur && sso?.enabled === true,
    fournisseur: sso?.display_name ?? '',
    lie: user?.sso_lie === true,
    enCours,
    erreur,
    lier,
    delier,
  }
}

export type LiaisonSso = ReturnType<typeof useLiaisonSso>
