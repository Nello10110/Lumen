import { useCallback, useEffect, useState } from 'react'
import { api, ErreurPortailAuthentification } from '../api/client'
import {
  oublierTentativeRechargement,
  peutRechargerAutomatiquement,
  reinitialiserApplication,
} from '../auth/reinitialisationApplication'
import { useAuth } from '../hooks/useAuth'
import { PrimaryButton, SecondaryButton } from '../components/Controls'
import { Field, Input } from '../components/Field'
import { GlassPanel } from '../components/GlassPanel'
import LumenMark from '../components/LumenMark'

type Mode = 'connexion' | 'creation'

// Message d'erreur renvoyé par le backend après un échec de connexion SSO (backlog
// SSO) — porté en query param sur la redirection finale du callback OIDC, puisque
// cette page n'a jamais vu la requête XHR qui a échoué.
function erreurOidcDepuisUrl(): string | null {
  return new URLSearchParams(window.location.search).get('oidc_error')
}

export default function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('connexion')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(() => erreurOidcDepuisUrl())
  // Trois états, jamais deux (retour utilisateur du 14/09/2026) : « le SSO n'est pas
  // configuré » et « je n'ai pas réussi à le demander » ne sont PAS la même chose, et
  // les confondre est exactement ce qui a fait perdre l'accès à l'application.
  //
  // Historique : l'échec était silencieux par choix (backlog 2.K.5), au motif qu'un
  // bouton absent sur un déploiement sans SSO n'est pas une erreur. Vrai — mais
  // seulement quand le serveur a RÉPONDU. Quand l'appel échoue, on ne sait rien, et
  // afficher un écran de connexion amputé revient à mentir : sur un téléphone, avec
  // l'application servie depuis le cache du service worker, l'utilisateur se
  // retrouvait devant un écran d'apparence normale, sans son seul moyen de
  // connexion, sans rien qui l'explique — et sans autre issue que de vider le cache
  // dans les réglages du système.
  const [statutOidc, setStatutOidc] = useState<'inconnu' | 'absent' | 'disponible' | 'indisponible'>('inconnu')
  const [oidcDisplayName, setOidcDisplayName] = useState('SSO')
  const [portailExpire, setPortailExpire] = useState(false)

  const chargerStatutOidc = useCallback(async () => {
    setStatutOidc('inconnu')
    setPortailExpire(false)
    try {
      const s = await api.getOidcStatus()
      oublierTentativeRechargement()
      setOidcDisplayName(s.display_name)
      setStatutOidc(s.enabled ? 'disponible' : 'absent')
    } catch (err) {
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
      if (err instanceof ErreurPortailAuthentification) {
        setPortailExpire(true)
        if (peutRechargerAutomatiquement()) {
          void reinitialiserApplication()
          return
        }
      }
      setStatutOidc('indisponible')
    }
  }, [])

  useEffect(() => {
    if (erreurOidcDepuisUrl()) {
      const params = new URLSearchParams(window.location.search)
      params.delete('oidc_error')
      const reste = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (reste ? `?${reste}` : ''))
    }
    void chargerStatutOidc()
  }, [chargerStatutOidc])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (mode === 'connexion') await login(username, password)
      else await register(username, password)
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
              {mode === 'connexion' ? 'Bon retour' : 'Créer un compte'}
            </h1>
            <p className="text-sm text-ink3">Lumen</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Nom d'utilisateur">
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </Field>
          <Field label="Mot de passe" aide={mode === 'creation' ? '8 caractères minimum' : undefined}>
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
            {saving ? 'Un instant...' : mode === 'connexion' ? 'Se connecter' : 'Créer mon compte'}
          </PrimaryButton>
        </form>

        {statutOidc === 'disponible' && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-ink4">
              <span className="h-px flex-1 bg-hairline" />
              ou
              <span className="h-px flex-1 bg-hairline" />
            </div>
            <a
              href="/api/auth/oidc/login"
              className="block rounded-control border border-hairline bg-chip px-4 py-2 text-center text-sm font-medium text-ink2 hover:bg-hover"
            >
              Se connecter avec {oidcDisplayName}
            </a>
          </>
        )}

        {/* Le serveur n'a pas répondu : on ne sait pas si le SSO existe. On le DIT,
            avec les deux issues possibles — au lieu d'afficher un écran amputé qui
            laisse croire que la connexion par SSO n'existe pas sur ce déploiement. */}
        {statutOidc === 'indisponible' && (
          <div className="mt-4 rounded-control border border-hairline bg-chip p-3 text-[13px] text-ink2">
            <p>
              {portailExpire
                ? "La session avec le portail d’authentification a expiré : l’application est affichée depuis le cache, mais elle ne parle plus au serveur. « Se reconnecter » la recharge depuis le réseau pour t’y reconnecter."
                : "Impossible de joindre le serveur : si ce foyer utilise une connexion SSO, son bouton ne peut pas être affiché pour l’instant."}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {/* Deux actions, pas trois : un simple « Recharger la page » serait
                  trompeur — le service worker resservirait la même coquille depuis
                  son cache sans jamais contacter le serveur. */}
              <SecondaryButton onClick={() => void chargerStatutOidc()}>Réessayer</SecondaryButton>
              {/* La sortie de secours, enfin dans l'application : c'est exactement ce
                  que l'utilisateur devait aller faire à la main dans les réglages de
                  son téléphone (retour du 14/09/2026). */}
              <SecondaryButton onClick={() => void reinitialiserApplication()}>
                {portailExpire ? 'Se reconnecter' : "Vider le cache de l'application"}
              </SecondaryButton>
            </div>
          </div>
        )}

        {/* Les deux onglets « Se connecter / Créer un compte » deviennent un simple
            lien (maquette de la refonte) : ils donnaient le même poids visuel aux deux
            actions, alors qu'on se connecte cent fois pour un compte créé une fois. La
            création reste accessible, sans hiérarchiser à tort. */}
        <p className="mt-5 text-center text-[13px] text-ink3">
          {mode === 'connexion' ? (
            <>
              Pas encore de compte ?{' '}
              <button type="button" onClick={() => setMode('creation')} className="font-medium text-accent hover:underline">
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{' '}
              <button type="button" onClick={() => setMode('connexion')} className="font-medium text-accent hover:underline">
                Se connecter
              </button>
            </>
          )}
        </p>
      </GlassPanel>
    </div>
  )
}
