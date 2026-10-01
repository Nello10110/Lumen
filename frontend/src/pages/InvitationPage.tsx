import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ApercuInvitation, AuthUser, Role } from '../api/types'
import { rechargerApplication } from '../auth/changementFoyer'
import { armerRetourSso, garderInvitation, invitationGardee, oublierInvitation } from '../auth/invitationEnAttente'
import { clearToken, getToken, setToken } from '../auth/tokenStorage'
import AccueilFoyer from '../components/AccueilFoyer'
import { PrimaryButton, SecondaryButton } from '../components/Controls'
import EtatErreur from '../components/EtatErreur'
import { Field, Input } from '../components/Field'
import { GlassPanel } from '../components/GlassPanel'
import LumenMark from '../components/LumenMark'
import { SkeletonTexte } from '../components/Skeleton'
import { activerLangue, estLangue, langueActive, t } from '../i18n'
import { extraireJeton } from '../utils/invitation'
import { libelleRole } from '../utils/libelleRole'

type Mode = 'creation' | 'connexion'

/** Le jeton du lien, lu dans le FRAGMENT de l'URL (`/invitation#<jeton>`) : le navigateur
 * ne l'envoie ni au serveur ni dans le `Referer`, il ne finit dans aucun journal de proxy.
 * Il est aussitôt gardé en `sessionStorage` (un rechargement ou un aller-retour SSO le
 * perdrait sinon), puis le fragment est retiré de la barre d'adresse : le lien ne reste ni
 * dans l'historique ni dans une capture d'écran.
 *
 * Sans fragment, on reprend le jeton gardé (page rechargée après le nettoyage). */
function lireJeton(): string | null {
  const fragment = window.location.hash.slice(1)
  if (fragment) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    const jeton = extraireJeton(fragment)
    if (!jeton) return null
    garderInvitation(jeton)
    return jeton
  }
  return invitationGardee()?.jeton ?? null
}

/** Ouverture d'un lien d'invitation (backlog § BK.2b) — page PUBLIQUE, montée hors
 * d'`AuthProvider` comme `/partage/:token` (cf. `App.tsx`) : elle sert aussi bien à
 * quelqu'un qui n'a aucun compte qu'à un compte déjà connecté, et se suffit à elle-même.
 *
 * Trois voies pour un visiteur anonyme : créer un compte (la session s'ouvre sur le
 * foyer), se connecter à un compte existant (le jeton gardé est alors accepté), ou passer
 * par le SSO (l'acceptation se fait au retour, cf. `ContenuAuthentifie`). Un compte déjà
 * connecté accepte d'un clic.
 *
 * Une invitation peut aussi servir à CRÉER un foyer (§ BK.2d, `cree_un_foyer`) : la page ne dit
 * plus « rejoindre » mais « créer votre foyer », envoie la langue de l'appareil (qui devient celle
 * du foyer neuf), et mène directement à l'application — le compte en est le propriétaire,
 * l'assistant de bienvenue se joue, il n'y a pas d'accueil court.
 *
 * Le jeton est envoyé dans le CORPS des requêtes, jamais dans l'URL. Toute erreur de
 * jeton est un 404 identique pour le serveur (absent, expiré, révoqué, utilisé) : la page
 * n'en dit pas plus, elle ne le pourrait pas. */
export default function InvitationPage() {
  const [jeton] = useState<string | null>(lireJeton)
  const [apercu, setApercu] = useState<ApercuInvitation | null>(null)
  const [erreurLien, setErreurLien] = useState<string | null>(() => (jeton ? null : t('invitationPage.lienInvalide')))
  const [connecte, setConnecte] = useState<AuthUser | null>(null)
  const [accueil, setAccueil] = useState<{ foyerNom: string | null; role: Role } | null>(null)
  const [oidc, setOidc] = useState<{ nom: string; logo: string | null } | null>(null)

  const [mode, setMode] = useState<Mode>('creation')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const creeUnFoyer = apercu?.cree_un_foyer === true
  const titre = creeUnFoyer ? t('invitationPage.titreCreation') : t('invitationPage.titre')

  useEffect(() => {
    document.title = `${titre} · Lumen`
  }, [titre])

  useEffect(() => {
    if (!jeton) return
    let actif = true
    api
      .consulterInvitation(jeton)
      .then(async (vue) => {
        // Page affichée dans la langue du foyer qui invite (§ BL.4), sans la retenir sur
        // l'appareil du visiteur (`activerLangue`, pas `changerLangue`) : ce n'est pas
        // SON choix.
        if (estLangue(vue.langue) && vue.langue !== langueActive()) {
          await activerLangue(vue.langue).catch(() => undefined)
          document.documentElement.lang = vue.langue
        }
        if (actif) setApercu(vue)
      })
      .catch((err: Error & { status?: number }) => {
        if (actif) setErreurLien(err.status === 404 ? t('invitationPage.lienInvalide') : err.message)
      })
    // Un jeton de session déjà présent : la personne est peut-être connectée, auquel cas
    // rejoindre le foyer se fait d'un clic. Un jeton périmé, lui, revient en erreur.
    if (getToken()) {
      api
        .getMe()
        .then((moi) => actif && setConnecte(moi))
        .catch(() => undefined)
    }
    api
      .getOidcStatus()
      .then((s) => actif && s.enabled && setOidc({ nom: s.display_name, logo: s.logo }))
      .catch(() => undefined)
    return () => {
      actif = false
    }
  }, [jeton])

  function rejoint(utilisateur: AuthUser) {
    oublierInvitation()
    if (creeUnFoyer) {
      rechargerApplication()
      return
    }
    setAccueil({ foyerNom: utilisateur.foyer_nom ?? apercu?.foyer_nom ?? null, role: utilisateur.role ?? apercu?.role ?? 'membre' })
  }

  async function creerCompte(e: React.FormEvent) {
    e.preventDefault()
    if (!jeton) return
    if (password !== confirmation) {
      setErreur(t('invitationPage.motsDePasseDifferents'))
      return
    }
    setEnCours(true)
    setErreur(null)
    try {
      const { token, user } = await api.accepterInvitationNouveauCompte(jeton, username.trim(), password, langueActive())
      setToken(token)
      rejoint(user)
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  async function accepter() {
    if (!jeton) return
    setEnCours(true)
    setErreur(null)
    try {
      rejoint(await api.accepterInvitation(jeton, langueActive()))
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  async function seConnecterEtRejoindre(e: React.FormEvent) {
    e.preventDefault()
    if (!jeton) return
    setEnCours(true)
    setErreur(null)
    try {
      const { token, user } = await api.login(username, password)
      setToken(token)
      setConnecte(user)
      // Connecté quoi qu'il arrive à l'acceptation : si elle échoue (déjà membre, jeton
      // devenu inutilisable), l'écran « connecté » prend le relais avec son message.
      try {
        rejoint(await api.accepterInvitation(jeton, langueActive()))
      } catch (err) {
        setErreur((err as Error).message)
      }
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setEnCours(false)
    }
  }

  function autreCompte() {
    api.logout().catch(() => {
      // Le jeton est de toute façon effacé localement : peu importe que la révocation côté
      // serveur ait réussi (déjà expiré, réseau coupé...).
    })
    clearToken()
    setConnecte(null)
    setErreur(null)
  }

  if (accueil) {
    return <AccueilFoyer foyerNom={accueil.foyerNom} role={accueil.role} onContinuer={rechargerApplication} />
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <GlassPanel niveau="hero" className="w-full max-w-[420px] rounded-[26px] px-7 py-[30px]">
        <div className="flex items-center gap-3">
          <LumenMark className="h-11 w-11 shrink-0" />
          <h1 className="text-[22px] font-semibold tracking-title text-ink">{titre}</h1>
        </div>

        {erreurLien ? (
          <div className="mt-5 space-y-4">
            <EtatErreur message={erreurLien} />
            <a href="/" className="inline-block text-sm font-medium text-accent hover:underline">
              {t('invitationPage.retourAccueil')}
            </a>
          </div>
        ) : !apercu ? (
          <div className="mt-5">
            <SkeletonTexte lignes={3} />
          </div>
        ) : (
          <>
            <p className="mt-5 text-sm text-ink2">
              {creeUnFoyer
                ? t('invitationPage.inviteCreation')
                : apercu.foyer_nom
                  ? t('invitationPage.inviteAvecNom', { foyer: apercu.foyer_nom, role: libelleRole(apercu.role) })
                  : t('invitationPage.inviteSansNom', { role: libelleRole(apercu.role) })}
            </p>
            {apercu.libelle && <p className="mt-1 text-sm text-ink3">{t('invitationPage.pour', { libelle: apercu.libelle })}</p>}

            {connecte ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-ink2">{t('invitationPage.connecteEn', { nom: connecte.nom || connecte.username })}</p>
                <p className="text-xs text-ink3">{creeUnFoyer ? t('invitationPage.ajouteAuxFoyersCreation') : t('invitationPage.ajouteAuxFoyers')}</p>
                <PrimaryButton onClick={() => void accepter()} disabled={enCours} className="w-full">
                  {creeUnFoyer ? t('invitationPage.creerLeFoyer') : t('invitationPage.rejoindre')}
                </PrimaryButton>
                <SecondaryButton onClick={autreCompte} className="w-full">
                  {t('invitationPage.autreCompte')}
                </SecondaryButton>
                <SecondaryButton onClick={rechargerApplication} className="w-full">
                  {t('invitationPage.ouvrirApplication')}
                </SecondaryButton>
                {erreur && <EtatErreur message={erreur} />}
              </div>
            ) : (
              <>
                <form onSubmit={mode === 'creation' ? creerCompte : seConnecterEtRejoindre} className="mt-6 flex flex-col gap-4">
                  <Field label={t('invitationPage.nomUtilisateur')}>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      minLength={mode === 'creation' ? 2 : undefined}
                      maxLength={mode === 'creation' ? 32 : undefined}
                      autoComplete="username"
                    />
                  </Field>
                  <Field
                    label={t('invitationPage.motDePasse')}
                    aide={mode === 'creation' ? t('invitationPage.huitCaracteres') : undefined}
                  >
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={mode === 'creation' ? 8 : undefined}
                      autoComplete={mode === 'creation' ? 'new-password' : 'current-password'}
                    />
                  </Field>
                  {mode === 'creation' && (
                    <Field label={t('invitationPage.confirmation')}>
                      <Input
                        type="password"
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </Field>
                  )}
                  {mode === 'connexion' && (
                    <p className="-mt-2 text-xs text-ink3">
                      {creeUnFoyer ? t('invitationPage.ajouteAuxFoyersCreation') : t('invitationPage.ajouteAuxFoyers')}
                    </p>
                  )}
                  {erreur && <EtatErreur message={erreur} />}
                  <PrimaryButton type="submit" disabled={enCours}>
                    {enCours
                      ? t('invitationPage.unInstant')
                      : mode === 'creation'
                        ? t(creeUnFoyer ? 'invitationPage.creerEtCreerFoyer' : 'invitationPage.creerEtRejoindre')
                        : t(creeUnFoyer ? 'invitationPage.seConnecterEtCreerFoyer' : 'invitationPage.seConnecterEtRejoindre')}
                  </PrimaryButton>
                </form>

                {oidc && jeton && (
                  <>
                    <div className="my-4 flex items-center gap-3 text-xs text-ink4">
                      <span className="h-px flex-1 bg-hairline" />
                      {t('invitationPage.ou')}
                      <span className="h-px flex-1 bg-hairline" />
                    </div>
                    {/* Le drapeau `invitation=true` : sans lui, un NOUVEAU compte SSO
                        recevrait son propre foyer vide avant d'avoir pu accepter celui-ci. */}
                    <a
                      href="/api/auth/oidc/login?invitation=true"
                      onClick={() => armerRetourSso(jeton)}
                      className="flex items-center justify-center gap-2 rounded-control border border-hairline bg-chip px-4 py-2 text-center text-sm font-medium text-ink2 hover:bg-hover"
                    >
                      {oidc.logo && <img src={oidc.logo} alt="" aria-hidden className="h-5 w-5 shrink-0 object-contain" />}
                      {t('invitationPage.continuerAvec', { fournisseur: oidc.nom })}
                    </a>
                  </>
                )}

                <p className="mt-5 text-center text-[13px] text-ink3">
                  {mode === 'creation' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('connexion')
                        setErreur(null)
                      }}
                      className="font-medium text-accent hover:underline"
                    >
                      {t('invitationPage.dejaUnCompte')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('creation')
                        setErreur(null)
                      }}
                      className="font-medium text-accent hover:underline"
                    >
                      {t('invitationPage.pasDeCompte')}
                    </button>
                  )}
                </p>
              </>
            )}
          </>
        )}
      </GlassPanel>
    </div>
  )
}
