import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { t } from '../i18n'
import { useAuth } from './useAuth'

/** Issue d'une liaison SSO, à montrer à l'utilisateur (`BandeauLiaisonSso`). */
export type RetourLiaisonSso = { type: 'succes' } | { type: 'erreur'; message: string }

/** Longueur maximale du message du serveur affiché : il arrive dans l'adresse de la page, donc
 * quelqu'un d'autre peut avoir composé le texte. React l'échappe ; on le borne en plus. */
const LONGUEUR_MAX_MESSAGE = 300

/** Retour d'une liaison « Lier mon compte SSO » (backlog § BK.2d), à la racine de l'application.
 *
 * Après l'autorisation chez le fournisseur, le serveur ne lie RIEN : il renvoie ici avec
 * `?oidc_liaison=<code>`, sans ouvrir de session — ou `?oidc_liaison_erreur=<message>`. Ce hook :
 *
 * 1. lit le paramètre et le retire AUSSITÔT de la barre d'adresse (`history.replaceState`) :
 *    le code ne reste ni dans l'historique ni dans une capture d'écran, et un rechargement ne
 *    le rejoue pas. Il vit en mémoire de ce composant et nulle part ailleurs (ni stockage du
 *    navigateur, ni journal) ;
 * 2. une fois l'utilisateur connu, le confirme avec la session DE CE COMPTE
 *    (`POST /auth/oidc/lier/confirmer`) : c'est le serveur qui vérifie que le compte courant est
 *    bien le compte visé, sinon il détruit la liaison en attente. Sans session ouverte, le code
 *    est abandonné — il ne doit jamais être confirmé par un compte qui s'ouvrirait ensuite.
 *
 * Il ne peut y avoir qu'un traitement par chargement de page : la lecture est gardée par une
 * référence, que le double montage de `StrictMode` ne réinitialise pas. */
export function useRetourLiaisonSso() {
  const { user, loading, refetchUser } = useAuth()
  const [code, setCode] = useState<string | null>(null)
  const [retour, setRetour] = useState<RetourLiaisonSso | null>(null)
  const lu = useRef(false)

  useEffect(() => {
    if (lu.current) return
    lu.current = true
    const params = new URLSearchParams(window.location.search)
    const recu = params.get('oidc_liaison')
    const erreur = params.get('oidc_liaison_erreur')
    if (recu === null && erreur === null) return
    params.delete('oidc_liaison')
    params.delete('oidc_liaison_erreur')
    const reste = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (reste ? `?${reste}` : '') + window.location.hash)
    if (erreur !== null) setRetour({ type: 'erreur', message: erreur.slice(0, LONGUEUR_MAX_MESSAGE) })
    else if (recu) setCode(recu)
  }, [])

  useEffect(() => {
    if (code === null || loading) return
    setCode(null)
    if (!user) {
      setRetour({ type: 'erreur', message: t('liaisonSso.sessionAbsente') })
      return
    }
    api
      .confirmerLiaisonSso(code)
      .then(() => refetchUser())
      .then(() => setRetour({ type: 'succes' }))
      .catch((err: Error) => setRetour({ type: 'erreur', message: err.message }))
  }, [code, loading, user, refetchUser])

  return { retour, fermer: () => setRetour(null) }
}
