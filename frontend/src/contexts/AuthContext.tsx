import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { langueActive } from '../i18n'
import { api, ErreurServeurInjoignable } from '../api/client'
import type { AuthUser } from '../api/types'
import { delaiAvantEssai, peutReessayer } from '../auth/reconnexionServeur'
import { clearToken, getToken, setToken, setUnauthorizedHandler } from '../auth/tokenStorage'
import { AuthContext, type AuthContextValue } from './authContextObject'

/** Authentification (Milestone 1, multi-utilisateur). Au montage : si un jeton existe
 * déjà en `localStorage`, `GET /auth/me` le valide auprès du serveur (un jeton
 * présent localement peut avoir expiré ou été révoqué ailleurs) avant de considérer
 * l'utilisateur connecté — `loading` reste `true` le temps de cette vérification, pour
 * que `App` n'affiche ni l'écran de connexion ni le contenu protégé en attendant. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  useEffect(() => {
    // Retour de connexion Authentik (backlog SSO Authentik) : le backend redirige
    // vers la racine du frontend avec `#token=...` — un fragment n'est jamais envoyé
    // à aucun serveur (ni journalisé par un éventuel proxy intermédiaire), seul le
    // navigateur le lit. On le capture avant toute autre chose, puis on nettoie
    // immédiatement l'URL pour qu'un rechargement/partage du lien ne le réexpose pas.
    if (window.location.hash.startsWith('#token=')) {
      setToken(decodeURIComponent(window.location.hash.slice('#token='.length)))
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }

    if (!getToken()) {
      setLoading(false)
      return
    }
    let actif = true
    let minuterie: ReturnType<typeof setTimeout> | undefined
    // Un serveur qui redémarre (déploiement) n'invalide pas le jeton : on le garde et on
    // réessaie tant que cela reste raisonnable, au lieu de déconnecter l'utilisateur sur
    // un 502 (correctif #88). Toute autre erreur — un 401 en tête — le révoque.
    const verifierSession = (essai: number) => {
      api
        .getMe()
        .then((u) => {
          if (actif) {
            setUser(u)
            setLoading(false)
          }
        })
        .catch((err) => {
          if (!actif) return
          if (err instanceof ErreurServeurInjoignable && peutReessayer(essai)) {
            minuterie = setTimeout(() => verifierSession(essai + 1), delaiAvantEssai(essai))
            return
          }
          // Serveur toujours muet après tous les essais : on rend la main à l'écran de
          // connexion SANS effacer le jeton (il redeviendra utilisable avec le serveur).
          if (!(err instanceof ErreurServeurInjoignable)) clearToken()
          setLoading(false)
        })
    }
    verifierSession(0)
    return () => {
      actif = false
      clearTimeout(minuterie)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (username, password) => {
        const { token, user: connecte } = await api.login(username, password)
        setToken(token)
        setUser(connecte)
      },
      register: async (username, password) => {
        const { token, user: cree } = await api.register(username, password, langueActive())
        setToken(token)
        setUser(cree)
      },
      logout: () => {
        api.logout().catch(() => {
          // Le jeton est de toute façon effacé localement ci-dessous : peu importe
          // que la révocation côté serveur ait réussi (déjà expiré, réseau coupé...).
        })
        clearToken()
        setUser(null)
      },
      completeOnboarding: async () => {
        const utilisateur = await api.completeOnboarding()
        setUser(utilisateur)
      },
      refetchUser: async () => {
        setUser(await api.getMe())
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
