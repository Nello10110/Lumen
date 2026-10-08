import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { PrimaryButton, SecondaryButton } from './Controls'
import { useSaisieEnCours } from '../hooks/useSaisieEnCours'
import { t } from '../i18n'
import {
  lireVersionEnAttente,
  marquerVersionRechargee,
  reporterVersion,
  versionDejaRechargee,
  versionReportee,
} from '../utils/miseAJourApplication'

// Un déploiement peut survenir n'importe quand pendant qu'un onglet reste ouvert
// (retour utilisateur du 10/09/2026 : le bouton de connexion SSO disparaissait
// après une longue période d'inactivité, l'onglet ayant manqué toute vérification
// d'une éventuelle nouvelle version) — sans vérification active, le service worker
// ne se met à jour qu'au hasard d'une navigation complète (Chrome/Firefox
// vérifient au chargement, puis au mieux une fois par 24 h tant que l'onglet
// reste actif). Une heure est un compromis raisonnable : assez rapproché pour
// qu'un onglet resté ouvert des jours ne rate jamais un déploiement bien
// longtemps, assez espacé pour ne jamais peser sur le réseau.
const INTERVALLE_VERIFICATION_MS = 60 * 60 * 1000

/** Mise à jour de l'application après un déploiement (retour utilisateur du 10/09/2026,
 * puis correctif #88 : la bannière revenait à chaque rechargement pour la même version,
 * et demandait une action là où il n'y en avait aucune à faire).
 *
 * `registerType: "prompt"` (`vite.config.ts`) : le service worker fraîchement téléchargé
 * n'active JAMAIS tout seul — `updateServiceWorker(true)` est le seul déclencheur.
 * Sans ce composant, la nouvelle version restait silencieusement en attente jusqu'à la
 * PROCHAINE navigation complète (parfois jamais, pour un onglet resté ouvert) : c'est ce
 * qui faisait disparaître le bouton de connexion SSO — l'onglet tournait encore sur le
 * code JS d'une version antérieure, sans le moindre signe visible du problème.
 *
 * Quand une version attend :
 * - rien à perdre (aucun champ modifié, aucune modale ouverte) : on attend un moment où
 *   l'utilisateur ne regarde pas — l'onglet passe en arrière-plan, ou il change d'écran —
 *   et on actualise sans rien dire ;
 * - saisie en cours : une bannière discrète, non bloquante, laisse le choix. « Plus tard »
 *   est mémorisé PAR VERSION pour l'onglet : la bannière ne revient pas pour la même
 *   version, elle revient pour la suivante.
 *
 * Portail vers `document.body` (même raison que `Modale.tsx`) : `position: fixed`
 * sur un descendant d'un ancêtre `backdrop-filter` devient relatif À CET ANCÊTRE,
 * pas à la fenêtre — sans portail, une bannière posée n'importe où dans l'arbre
 * pourrait un jour se retrouver enfermée derrière un panneau de verre. */
export default function MiseAJourDisponible() {
  const intervalle = useRef<ReturnType<typeof setInterval> | null>(null)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Vérification immédiate en plus de l'intervalle ci-dessous (retour
      // utilisateur du 13/09/2026 : le bouton SSO manquait encore après un
      // simple Ctrl+F5 nécessaire malgré ce composant) : sans cet appel
      // immédiat, un onglet fraîchement ouvert (nouvelle visite, pas un
      // onglet resté ouvert des heures) ne déclenchait AUCUNE vérification
      // avant la première heure d'attente — la vérification automatique du
      // navigateur lui-même est throttlée à une fois par 24 h par
      // registration de service worker, donc un déploiement survenu dans
      // cette fenêtre de 24 h restait invisible tant que l'onglet n'avait
      // pas dépassé une heure d'ouverture continue. `registration.update()`
      // explicite n'est PAS soumis à ce throttle (`sw.js` est servi en
      // `no-cache` par nginx, cf. `docker/nginx.conf`) : il détecte donc la
      // nouvelle version dès CE chargement, sans attendre ni l'intervalle ni
      // le prochain contrôle spontané du navigateur.
      void registration.update()
      if (intervalle.current) clearInterval(intervalle.current)
      intervalle.current = setInterval(() => {
        void registration.update()
      }, INTERVALLE_VERIFICATION_MS)
    },
  })
  const saisieEnCours = useSaisieEnCours()
  const { pathname } = useLocation()
  const [bandeau, setBandeau] = useState(false)
  // Version en attente, et si l'on guette un moment sûr pour l'actualiser en silence.
  const version = useRef<string | null>(null)
  const guette = useRef(false)

  useEffect(
    () => () => {
      if (intervalle.current) clearInterval(intervalle.current)
    },
    [],
  )

  const actualiser = () => {
    if (version.current) marquerVersionRechargee(version.current)
    void updateServiceWorker(true)
  }

  // Un moment où recharger ne dérange personne : l'onglet vient de passer en arrière-plan,
  // ou l'utilisateur change d'écran. La saisie est réévaluée À CET INSTANT.
  const momentSur = useEffectEvent(() => {
    if (!guette.current) return
    guette.current = false
    if (saisieEnCours()) setBandeau(true)
    else actualiser()
  })

  useEffect(() => {
    if (!needRefresh) return
    let actif = true
    void lireVersionEnAttente().then((lue) => {
      if (!actif) return
      version.current = lue
      if (lue && versionReportee(lue)) return
      // Version illisible ou déjà essayée sans succès : jamais de rechargement sans
      // garde, la bannière laisse la main.
      if (!lue || versionDejaRechargee(lue) || saisieEnCours()) setBandeau(true)
      else guette.current = true
    })
    return () => {
      actif = false
      guette.current = false
    }
  }, [needRefresh, saisieEnCours])

  useEffect(() => {
    momentSur()
  }, [pathname])

  useEffect(() => {
    const auChangementDeVisibilite = () => {
      if (document.hidden) momentSur()
    }
    document.addEventListener('visibilitychange', auChangementDeVisibilite)
    return () => document.removeEventListener('visibilitychange', auChangementDeVisibilite)
  }, [])

  if (!needRefresh || !bandeau) return null

  const plusTard = () => {
    if (version.current) reporterVersion(version.current)
    setBandeau(false)
    setNeedRefresh(false)
  }

  return createPortal(
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center gap-3 rounded-panel border border-stroke bg-panel-hi px-4 py-3 text-sm text-ink shadow-glass-lg backdrop-blur-glass"
    >
      <span>{t('miseAJourDisponible.miseAJourPrete')}</span>
      <div className="flex gap-2">
        <PrimaryButton onClick={actualiser}>{t('miseAJourDisponible.actualiser')}</PrimaryButton>
        <SecondaryButton onClick={plusTard}>{t('miseAJourDisponible.plusTard')}</SecondaryButton>
      </div>
    </div>,
    document.body,
  )
}
