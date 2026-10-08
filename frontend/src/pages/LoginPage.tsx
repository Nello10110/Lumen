import { useEffect, useState } from 'react'
import { reinitialiserApplication } from '../auth/reinitialisationApplication'
import { useAuth } from '../hooks/useAuth'
import { useStatutOidc } from '../hooks/useStatutOidc'
import { PrimaryButton, SecondaryButton } from '../components/Controls'
import { Field, Input } from '../components/Field'
import { GlassPanel } from '../components/GlassPanel'
import LumenMark from '../components/LumenMark'
import { armerFlashConnexion } from '../utils/flashConnexion'
import { t } from '../i18n'
import { useLangue } from '../i18n/useLangue'
import SelecteurLangue from '../components/SelecteurLangue'

type Mode = 'connexion' | 'creation'

// Message d'erreur renvoyé par le backend après un échec de connexion SSO (backlog
// SSO) — porté en query param sur la redirection finale du callback OIDC, puisque
// cette page n'a jamais vu la requête XHR qui a échoué.
function erreurOidcDepuisUrl(): string | null {
  return new URLSearchParams(window.location.search).get('oidc_error')
}

export default function LoginPage() {
  const { login, register } = useAuth()
  const { langue, changerLangue } = useLangue()
  const [mode, setMode] = useState<Mode>('connexion')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(() => erreurOidcDepuisUrl())
  // Ce que l'écran sait du serveur (cf. `useStatutOidc`) : « le SSO n'est pas configuré »,
  // « le serveur redémarre » et « une panne dure » ne sont PAS la même chose, et les
  // confondre est ce qui a fait perdre l'accès à l'application (retour du 14/09/2026).
  const { statut: statutOidc, nomFournisseur: oidcDisplayName, logo: oidcLogo, reessayer } = useStatutOidc()

  useEffect(() => {
    if (erreurOidcDepuisUrl()) {
      const params = new URLSearchParams(window.location.search)
      params.delete('oidc_error')
      const reste = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (reste ? `?${reste}` : ''))
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (mode === 'connexion') await login(username, password)
      else await register(username, password)
      // Backlog § AH.1 (15/09/2026) : armé seulement après un succès — un échec de
      // connexion ne doit jamais provoquer de flash au prochain essai réussi qui,
      // lui, n'a pas eu lieu MAINTENANT.
      armerFlashConnexion()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    // Pas de fond opaque ici : l'écran de connexion est le premier endroit où le
    // fond à halos de la refonte est visible, le panneau de verre flottant dessus.
    <div className="flex min-h-screen items-center justify-center px-6">
      <GlassPanel niveau="hero" className="w-full max-w-[400px] rounded-[26px] px-7 py-[30px]">
        <div className="flex items-center gap-3">
          <LumenMark className="h-11 w-11 shrink-0" />
          <div>
            <h1 className="text-[26px] font-semibold tracking-title text-ink">
              {mode === 'connexion' ? t('connexion.bonRetour') : t('connexion.creerUnCompte')}
            </h1>
            <p className="text-sm text-ink3">{t('connexion.accroche')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field label={t('connexion.nomUtilisateur')}>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </Field>
          <Field label={t('connexion.motDePasse')} aide={mode === 'creation' ? t('connexion.huitCaracteres') : undefined}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'creation' ? 8 : undefined}
              autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
            />
          </Field>

          {error && <p className="text-sm text-neg">{error}</p>}

          <PrimaryButton type="submit" disabled={saving} className="w-full">
            {saving ? t('connexion.unInstant') : mode === 'connexion' ? t('connexion.seConnecter') : t('connexion.creerMonCompte')}
          </PrimaryButton>
        </form>

        {statutOidc === 'disponible' && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-ink4">
              <span className="h-px flex-1 bg-hairline" />
              {t('connexion.ou')}
              <span className="h-px flex-1 bg-hairline" />
            </div>
            <a
              href="/api/auth/oidc/login"
              className="flex items-center justify-center gap-2 rounded-control border border-hairline bg-chip px-4 py-2 text-center text-sm font-medium text-ink2 hover:bg-hover"
            >
              {/* `alt` vide et `aria-hidden` : le libellé juste à côté dit déjà où
                  mène ce bouton — un lecteur d'écran annoncerait sinon deux fois la
                  même chose. Le texte reste affiché avec le logo (et pas remplacé
                  par lui) pour que le bouton reste lisible si l'image ne charge
                  pas. */}
              {oidcLogo && <img src={oidcLogo} alt="" aria-hidden className="h-5 w-5 shrink-0 object-contain" />}
              {t('connexion.seConnecterAvec', { fournisseur: oidcDisplayName })}
            </a>
          </>
        )}

        {/* Le serveur ne répond pas : on ne sait pas si le SSO existe. On le DIT, au lieu
            d'afficher un écran amputé qui laisse croire que la connexion par SSO n'existe
            pas sur ce déploiement. Même emplacement que le bouton SSO qu'il remplace :
            rien au-dessus ne bouge quand l'un laisse la place à l'autre. La région
            `output` (rôle `status`) existe en permanence, pour que le lecteur d'écran annonce le texte
            quand il apparaît. */}
        <output className="block">
          {statutOidc === 'reconnexion' && (
            <p className="mt-4 flex items-center gap-2.5 rounded-control border border-hairline bg-chip px-3.5 py-3 text-[13px] text-ink2">
              <span
                aria-hidden
                className="h-4 w-4 shrink-0 rounded-full border-2 border-hairline border-t-accent motion-safe:animate-spin"
              />
              {t('connexion.serveurRedemarre')}
            </p>
          )}
          {statutOidc === 'panne' && (
            <div className="mt-4 rounded-control border border-hairline bg-chip p-3.5 text-[13px] text-ink2">
              <p>{t('connexion.serveurSilencieux')}</p>
              <div className="mt-2.5">
                <SecondaryButton onClick={reessayer}>{t('connexion.reessayer')}</SecondaryButton>
              </div>
              {/* Repli manuel, discret : utile quand une coquille périmée en cache empêche
                  d'atteindre le serveur, mais jamais la première chose proposée. */}
              <details className="mt-3 text-ink3">
                <summary className="cursor-pointer select-none hover:text-ink2">{t('connexion.problemePersiste')}</summary>
                <p className="mt-2">{t('connexion.reinitialiserExplication')}</p>
                <button
                  type="button"
                  onClick={() => void reinitialiserApplication()}
                  className="mt-1.5 font-medium text-accent hover:underline"
                >
                  {t('connexion.reinitialiserApplication')}
                </button>
              </details>
            </div>
          )}
          {statutOidc === 'portail' && (
            <div className="mt-4 rounded-control border border-hairline bg-chip p-3.5 text-[13px] text-ink2">
              <p>{t('connexion.portailExpire')}</p>
              <div className="mt-2.5">
                {/* Pas un simple « Recharger la page » : le service worker resservirait la
                    même coquille depuis son cache sans jamais contacter le serveur. */}
                <SecondaryButton onClick={() => void reinitialiserApplication()}>{t('connexion.seReconnecter')}</SecondaryButton>
              </div>
            </div>
          )}
        </output>

        {/* Les deux onglets « Se connecter / Créer un compte » deviennent un simple
            lien (maquette de la refonte) : ils donnaient le même poids visuel aux deux
            actions, alors qu'on se connecte cent fois pour un compte créé une fois. La
            création reste accessible, sans hiérarchiser à tort. */}
        <p className="mt-5 text-center text-[13px] text-ink3">
          {mode === 'connexion' ? (
            <>
              {t('connexion.pasEncoreDeCompte')}{' '}
              <button type="button" onClick={() => setMode('creation')} className="font-medium text-accent hover:underline">
                {t('connexion.creerUnCompte')}
              </button>
            </>
          ) : (
            <>
              {t('connexion.dejaUnCompte')}{' '}
              <button type="button" onClick={() => setMode('connexion')} className="font-medium text-accent hover:underline">
                {t('connexion.seConnecter')}
              </button>
            </>
          )}
        </p>

        {/* Langue de CET appareil (backlog § BL) : avant connexion, on ne connaît pas
            encore le foyer. Le premier compte crée son foyer dans cette langue ; un
            foyer existant impose ensuite la sienne dès la connexion. */}
        <div className="mt-4 flex justify-center">
          <SelecteurLangue valeur={langue} onChange={(l) => void changerLangue(l)} className="max-w-[180px] text-[13px]" />
        </div>
      </GlassPanel>
    </div>
  )
}
