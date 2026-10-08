import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ErreurPortailAuthentification, ErreurServeurInjoignable } from '../api/client'
import {
  oublierTentativeRechargement,
  peutRechargerAutomatiquement,
  reinitialiserApplication,
} from '../auth/reinitialisationApplication'
import { delaiAvantEssai, peutReessayer } from '../auth/reconnexionServeur'

/** Ce que l'écran de connexion sait du serveur — jamais deux cas confondus (retour
 * utilisateur du 14/09/2026, puis correctif #88) :
 * - `inconnu`     : la vérification est en cours ;
 * - `absent` / `disponible` : le serveur a RÉPONDU, le SSO n'est pas / est configuré ;
 * - `reconnexion` : le serveur ne répond pas (redémarrage, coupure) — l'écran réessaie
 *   seul, l'utilisateur n'a rien à faire ;
 * - `panne`       : il ne répond toujours pas après tous les essais, ou répond mal ;
 * - `portail`     : un portail d'authentification s'est interposé (page HTML à la place du
 *   JSON), et le rechargement automatique unique a déjà eu lieu. */
export type StatutOidc = 'inconnu' | 'absent' | 'disponible' | 'reconnexion' | 'panne' | 'portail'

export function useStatutOidc() {
  const [statut, setStatut] = useState<StatutOidc>('inconnu')
  const [nomFournisseur, setNomFournisseur] = useState('SSO')
  // Logo du bouton, posé depuis les Réglages (22/09/2026) — `null` par défaut, le
  // bouton se réduit alors à son libellé.
  const [logo, setLogo] = useState<string | null>(null)
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Invalide les essais en vol quand une nouvelle série démarre ou que l'écran disparaît.
  const serie = useRef(0)

  const arreter = useCallback(() => {
    serie.current += 1
    if (minuterie.current) clearTimeout(minuterie.current)
    minuterie.current = null
  }, [])

  const verifier = useCallback(
    async (essai: number, numeroSerie: number) => {
      try {
        const s = await api.getOidcStatus()
        if (numeroSerie !== serie.current) return
        oublierTentativeRechargement()
        setNomFournisseur(s.display_name)
        setLogo(s.logo)
        setStatut(s.enabled ? 'disponible' : 'absent')
      } catch (err) {
        if (numeroSerie !== serie.current) return
        if (err instanceof ErreurPortailAuthentification) {
          // Un portail d'authentification s'est interposé (sa propre page de connexion
          // renvoyée à la place du JSON). Pour lui rendre la main, il faut une navigation
          // qui parte VRAIMENT au réseau — et un simple `location.reload()` n'en est pas
          // une ici : le service worker sert toute navigation depuis son précache
          // (`NavigationRoute(createHandlerBoundToURL("index.html"))`, vérifié dans le
          // `sw.js` généré), sans jamais contacter le serveur. C'est précisément ce qui
          // enfermait l'utilisateur : recharger réaffichait indéfiniment la même coquille
          // en cache, et seul un vidage manuel du cache depuis les réglages du téléphone
          // en sortait.
          //
          // `reinitialiserApplication` désinstalle donc le service worker avant de
          // recharger : la navigation suivante atteint le réseau, le portail la voit
          // passer et redirige. Tenté UNE fois automatiquement — l'utilisateur n'a alors
          // rien à faire —, puis on explique et on lui laisse la main.
          if (peutRechargerAutomatiquement()) {
            void reinitialiserApplication()
            return
          }
          setStatut('portail')
        } else if (err instanceof ErreurServeurInjoignable) {
          // Redémarrage du backend après un déploiement, ou coupure : on réessaie seul,
          // avec une attente croissante, tant que cela reste raisonnable.
          if (peutReessayer(essai)) {
            setStatut('reconnexion')
            minuterie.current = setTimeout(() => void verifier(essai + 1, numeroSerie), delaiAvantEssai(essai))
          } else {
            setStatut('panne')
          }
        } else {
          // Le serveur a répondu, mais mal (erreur 500...) : réessayer seul n'y changerait rien.
          setStatut('panne')
        }
      }
    },
    [],
  )

  const reessayer = useCallback(() => {
    arreter()
    setStatut('inconnu')
    void verifier(0, serie.current)
  }, [arreter, verifier])

  useEffect(() => {
    void verifier(0, serie.current)
    return arreter
  }, [verifier, arreter])

  return { statut, nomFournisseur, logo, reessayer }
}
