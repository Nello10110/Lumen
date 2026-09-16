import { Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes, matchPath, useLocation } from 'react-router-dom'
import { api } from './api/client'
import type { Jalon } from './api/types'
import BarreControles from './components/BarreControles'
import BottomNav from './components/BottomNav'
import CelebrationJalon from './components/CelebrationJalon'
import EnTeteMobile from './components/EnTeteMobile'
import LumenMark from './components/LumenMark'
import MiseAJourDisponible from './components/MiseAJourDisponible'
import { SkeletonTexte } from './components/Skeleton'
import { useAppliquerTheme } from './hooks/useTheme'
import Sidebar from './components/Sidebar'
import RattrapageComptes from './components/onboarding/RattrapageComptes'
import WelcomeWizard from './components/onboarding/WelcomeWizard'
import { AuthProvider } from './contexts/AuthContext'
import { PreferencesAffichageProvider } from './contexts/PreferencesAffichageContext'
import { useAuth } from './hooks/useAuth'
import { PAGE_COMPONENTS } from './layout/pageComponents'
import { ROUTES } from './layout/routes'
import LoginPage from './pages/LoginPage'
import PageIntrouvablePage from './pages/PageIntrouvablePage'
import { useTendancePatrimoine } from './hooks/useTendancePatrimoine'
import { consommerFlashConnexion } from './utils/flashConnexion'

// `/partage/:token` (backlog 2.Q.1) est une page publique, jamais dans `ROUTES`
// (réservé aux écrans de l'application authentifiée) : lazy-chargée séparément de
// `layout/pageComponents.ts`.
const PartagePublicPage = lazy(() => import('./pages/PartagePublicPage'))

// Anciennes URL (avant le renommage backlog 2.K.2) : redirigées plutôt que
// supprimées, pour ne pas casser les marque-pages ou l'historique du navigateur.
// Vers la LISTE, pas vers `/patrimoine/${ticker}` (revu le 14/09/2026) : un ticker
// seul ne peut plus désigner une fiche précise depuis que deux lignes peuvent le
// partager (une par compte) — la route attend désormais un `holdingId` numérique,
// qu'un vieux marque-page ne peut évidemment pas connaître.
function RedirectionTicker() {
  return <Navigate to="/patrimoine" replace />
}

// Titre d'onglet dynamique (backlog 2.K.2) : `ROUTES` (`layout/routes.ts`) est la
// source unique pour l'URL, le libellé de navigation ET le titre d'onglet — évite
// que les trois divergent au fil des évolutions, comme le relevait l'audit UX.
function useTitreDocument() {
  const location = useLocation()
  useEffect(() => {
    const route = ROUTES.find((r) => matchPath({ path: r.path, end: true }, location.pathname))
    document.title = route ? `${route.titre} · Lumen` : 'Lumen'
  }, [location.pathname])
}

// Multi-utilisateur (Milestone 1) : tant que la connexion n'est pas vérifiée
// (`loading`), ou pas établie, seul l'écran de connexion est affiché — pas de route
// dédiée `/login`, l'état de connexion décide seul ce qui est rendu (plus simple
// qu'une redirection React Router pour un gate qui couvre TOUTE l'application).
function AppAuthentifiee() {
  const { user, loading } = useAuth()
  useTitreDocument()

  // Flash lumineux à la connexion (backlog § AH.1, 15/09/2026) : consomme le signal
  // posé par `LoginPage` (`armerFlashConnexion`) dès que `user` devient vrai — donc
  // exactement une fois par connexion réussie, jamais au chargement silencieux d'un
  // onglet déjà authentifié (`consommerFlashConnexion` renvoie alors `false`, rien
  // n'ayant été armé). Recalculé à chaque changement de `user`, mais la clé
  // `sessionStorage` étant retirée dès la première lecture, un second déclenchement
  // sur le même `user` (ex. un `refetchUser` après édition du profil) ne redéclenche
  // jamais le flash.
  const [flashConnexion, setFlashConnexion] = useState(false)
  useEffect(() => {
    if (!user || !consommerFlashConnexion()) return
    setFlashConnexion(true)
    const minuteur = setTimeout(() => setFlashConnexion(false), 500)
    return () => clearTimeout(minuteur)
  }, [user])
  const flash = flashConnexion && (
    <div
      aria-hidden="true"
      className="lumen-flash-connexion animate-lumen-flash-connexion pointer-events-none fixed inset-0 z-[100]"
    />
  )

  // Backlog § AG.3 (16/09/2026) : jalons franchis depuis la dernière connexion,
  // célébrés un par un (file d'attente plutôt qu'un seul — plusieurs peuvent
  // tomber le même jour) via `CelebrationJalon`. Réservé au propriétaire, seul
  // rôle autorisé côté backend (`/api/jalons`, cf. `main.py`) — même restriction
  // que l'assistant de bienvenue ci-dessous. Chargé une seule fois par connexion,
  // jamais reconsulté au fil de la session : un jalon franchi PENDANT la session
  // (ex. un objectif qui vient d'être atteint) attendra la prochaine connexion,
  // cohérent avec « ne dérange jamais en plein travail ».
  const [jalonsACelebrer, setJalonsACelebrer] = useState<Jalon[]>([])
  useEffect(() => {
    if (!user || user.role !== 'proprietaire') return
    api
      .listJalons()
      .then((jalons) => setJalonsACelebrer(jalons.filter((j) => j.nouveau)))
      .catch(() => {})
  }, [user])
  function fermerCelebration() {
    const [premier, ...reste] = jalonsACelebrer
    if (premier) api.marquerJalonCelebre(premier.id).catch(() => {})
    setJalonsACelebrer(reste)
  }
  const celebration = jalonsACelebrer[0] && <CelebrationJalon jalon={jalonsACelebrer[0]} onFermer={fermerCelebration} />

  // Backlog § AG.5 : ambiance visuelle discrète, réévaluée à chaque connexion
  // (comme le reste de cette fonction) plutôt que suivie en continu — un effet
  // d'AMBIANCE n'a pas besoin d'être recalculé à chaque changement du portefeuille
  // pendant la session, seulement de refléter la tendance générale du moment.
  const tendance = useTendancePatrimoine(!!user)
  const ambiance = tendance && (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 -z-10 lumen-ambiance-${tendance}`} />
  )

  if (loading) {
    // Backlog § AD.4 (15/09/2026) : un point lumineux qui grandit jusqu'au logo
    // plein (< 600 ms, `animate-lumen-allumage` posée dans `index.css`), plutôt
    // qu'un squelette de texte générique — cet écran, vu à chaque connexion, ne
    // reste affiché que le temps d'une vérification réseau (`GET /api/auth/me`),
    // quasi instantanée en pratique. `prefers-reduced-motion` désactive
    // l'animation elle-même (règle posée dans `index.css`), pas le logo.
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LumenMark className="h-14 w-14 animate-lumen-allumage" />
      </div>
    )
  }
  if (!user) return <LoginPage />
  // Assistant de configuration initiale (welcome board, backlog nouveau) : réservé au
  // propriétaire (créateur du foyer, seul à voir les réglages qu'il couvre) — un
  // membre/invité, créé par lui via `POST /household-members`, n'a jamais besoin de
  // le voir. `onboarding_termine` (`UserParametre`, cf. `preferences_service.py`)
  // reste `False` tant que l'assistant n'a pas été terminé ou explicitement passé.
  if (user.role === 'proprietaire' && !user.onboarding_termine)
    return (
      <>
        {flash}
        <WelcomeWizard />
      </>
    )
  // Écran de rattrapage bloquant (revue du 03/09/2026, compte obligatoire sur une
  // ligne financière) : `proprietaire` ET `membre` peuvent tous deux créer des
  // lignes sans compte (`_peut_ecrire` côté backend), donc tous deux doivent voir
  // ce gate — contrairement à l'onboarding ci-dessus, réservé au propriétaire. Un
  // `invite`, lecture seule, ne peut rien y corriger : jamais bloqué par un état
  // qu'il ne peut pas changer lui-même.
  if (user.role !== 'invite' && user.holdings_sans_compte > 0)
    return (
      <>
        {flash}
        <RattrapageComptes />
      </>
    )

  return (
    <PreferencesAffichageProvider>
      {flash}
      {celebration}
      {ambiance}
      {/* Coque de la refonte « liquid glass » (étape 3) : la racine ne défile jamais
          et laisse voir le fond à halos porté par `<body>` (plus de `bg-surface-elevee`
          opaque par-dessus). Les panneaux flottent dessus, séparés de 14 px. */}
      <div className="flex h-screen gap-[14px] overflow-hidden p-[14px]">
        <Sidebar />

        {/* `min-w-0` : sans lui, un tableau large (Patrimoine) force la colonne à
            s'élargir au lieu de défiler à l'intérieur — le défaut `min-width:auto`
            d'un enfant flex. */}
        <main className="flex min-w-0 flex-1 flex-col gap-[14px]">
          {/* Deux en-têtes exclusifs, jamais montés en même temps : la barre de
              contrôles desktop est `hidden md:flex`, `EnTeteMobile` est `md:hidden`.
              Même partage que `Sidebar`/`BottomNav` — la maquette mobile ne réduit pas
              la barre desktop, elle la remplace. */}
          <BarreControles />
          <EnTeteMobile />
          {/* Seule cette zone défile (`min-h-0` : sans lui, un enfant flex refuse de
              devenir plus petit que son contenu, et c'est la page entière qui
              défilerait — ce que la coque interdit). La barre de contrôles reste donc
              visible sans `position: sticky`.
              `pb-24` (backlog 2.K.4, < 768 px) : marge sous le contenu pour ne jamais
              le laisser passer sous `BottomNav`, fixe en bas de l'écran sur mobile. */}
          {/* Aucune largeur maximale ici (retour utilisateur du 07/09/2026 : « la
              fenêtre au milieu prend tout l'espace sur les maquettes, pas sur le
              site »). Le `max-w-6xl` qui traînait plafonnait le contenu à 1152 px et
              le centrait : invisible sur un écran de 1440 px, mais il laissait 500 px
              de vide à droite au-delà. La maquette, elle, donne `flex: 1` à la colonne
              de contenu — les panneaux vont jusqu'au bord, et ce sont EUX qui se
              donnent une largeur maximale quand leur contenu le demande (Réglages en
              colonne de 760 px, Connexion en 400 px). */}
          <div className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0">
            <Suspense fallback={<SkeletonTexte />}>
              <Routes>
                {ROUTES.map((r) => {
                  const Composant = PAGE_COMPONENTS[r.path]
                  return Composant ? <Route key={r.path} path={r.path} element={<Composant />} /> : null
                })}

                <Route path="/portefeuille" element={<Navigate to="/patrimoine" replace />} />
                <Route path="/portefeuille/:ticker" element={<RedirectionTicker />} />
                {/* Feature d'objectifs de répartition annuelle retirée (25/08/2026) —
                    cette ancienne URL redirige vers le Tableau de bord plutôt que de
                    disparaître, même logique que les autres redirections ci-dessus.
                    `/analyse`, qui redirigeait ici pour la même raison, est redevenue
                    un écran à part entière le 07/09/2026. */}
                <Route path="/repartition" element={<Navigate to="/" replace />} />
                {/* L'écran Dividendes est devenu l'onglet Revenus d'`Analyse`
                    (07/09/2026) : l'ancienne URL y mène directement. */}
                <Route path="/dividendes" element={<Navigate to="/analyse?onglet=revenus" replace />} />
                {/* Le Simulateur (projection/FIRE) est devenu l'onglet « Simulateur »
                    d'`Analyse` (16/09/2026, retour utilisateur : il n'avait pas sa
                    place sur `/objectifs`, aux côtés des objectifs suivis, avec
                    lesquels il ne partageait aucune donnée) : l'ancienne URL y mène
                    directement, à la place de son ancienne cible `/objectifs`. */}
                <Route path="/simulateur" element={<Navigate to="/analyse?onglet=projection" replace />} />
                {/* Backlog § AD.3 (15/09/2026) : jusqu'ici une URL inconnue tombait sur
                    un cadre vide, sans message — cette route capture tout ce qu'aucune
                    route ci-dessus n'a intercepté (React Router : matché en dernier
                    recours, quel que soit l'ordre de déclaration). */}
                <Route path="*" element={<PageIntrouvablePage />} />
              </Routes>
            </Suspense>
          </div>
        </main>

        <BottomNav />
      </div>
    </PreferencesAffichageProvider>
  )
}

// `/partage/:token` (backlog 2.Q.1) est une page PUBLIQUE, consultée par un
// visiteur anonyme sans compte : montée en dehors d'`AuthProvider`, jamais
// derrière l'écran de connexion — sinon un visiteur sans jeton n'y accéderait
// jamais. `Suspense` dédié : `AppAuthentifiee` (ci-dessus) n'est pas montée sur
// cette route, donc son propre `Suspense` ne la couvre pas.
function App() {
  // Applique le thème stocké dès le montage. Sans cet appel, la classe `dark`
  // n'était posée qu'à l'ouverture du menu Compte, seul endroit où vivait
  // `useTheme` — cf. sa docstring. Placé sur `App` et non `AppAuthentifiee` pour
  // couvrir aussi l'écran de connexion et les liens de partage public.
  useAppliquerTheme()

  return (
    <>
      {/* Montée une seule fois, hors des routes : un déploiement peut survenir
          pendant que l'utilisateur est sur l'écran de connexion aussi bien que
          dans l'application authentifiée. */}
      <MiseAJourDisponible />
      <Suspense fallback={<div className="p-6"><SkeletonTexte /></div>}>
        <Routes>
          <Route path="/partage/:token" element={<PartagePublicPage />} />
          <Route
            path="/*"
            element={
              <AuthProvider>
                <AppAuthentifiee />
              </AuthProvider>
            }
          />
        </Routes>
      </Suspense>
    </>
  )
}

export default App
