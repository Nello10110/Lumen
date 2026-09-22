import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ErreurPortailAuthentification } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import LoginPage from './LoginPage'

vi.mock('../api/client', () => ({
  api: {
    getOidcStatus: vi.fn(),
  },
  // Classe réelle (pas un double) : les écrans la reconnaissent par `instanceof`,
  // un faux la ferait passer inaperçue.
  ErreurPortailAuthentification: class ErreurPortailAuthentification extends Error {
    constructor() {
      super("La session avec le portail d'authentification a expiré.")
      this.name = 'ErreurPortailAuthentification'
    }
  },
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('LoginPage', () => {
  const login = vi.fn()
  const register = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login, register, logout: vi.fn(), completeOnboarding: vi.fn(), refetchUser: vi.fn() })
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: false, display_name: 'SSO', logo: null })
    window.history.replaceState(null, '', '/login')
    sessionStorage.clear()
  })

  it("mode connexion par défaut : soumettre appelle login avec nom d'utilisateur/mot de passe", async () => {
    const { container } = render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'paul' } })
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'mot-de-passe-solide' } })
    fireEvent.submit(container.querySelector('form')!)

    await waitFor(() => expect(login).toHaveBeenCalledWith('paul', 'mot-de-passe-solide'))
    expect(register).not.toHaveBeenCalled()
  })

  it('bascule vers "Créer un compte" : soumettre appelle register', async () => {
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Créer un compte' }))
    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'paul' } })
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'mot-de-passe-solide' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))

    await waitFor(() => expect(register).toHaveBeenCalledWith('paul', 'mot-de-passe-solide'))
    expect(login).not.toHaveBeenCalled()
  })

  it("affiche le message d'erreur renvoyé par login sans planter", async () => {
    login.mockRejectedValueOnce(new Error("Nom d'utilisateur ou mot de passe incorrect."))
    const { container } = render(<LoginPage />)

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'paul' } })
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'mauvais' } })
    fireEvent.submit(container.querySelector('form')!)

    await screen.findByText("Nom d'utilisateur ou mot de passe incorrect.")
  })
})

describe('LoginPage — connexion SSO (backlog SSO)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), completeOnboarding: vi.fn(), refetchUser: vi.fn() })
    window.history.replaceState(null, '', '/login')
    sessionStorage.clear()
  })

  it("n'affiche pas le bouton SSO quand il n'est pas configuré (ou désactivé) sur ce déploiement", async () => {
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: false, display_name: 'SSO', logo: null })

    render(<LoginPage />)

    await vi.waitFor(() => expect(api.getOidcStatus).toHaveBeenCalled())
    expect(screen.queryByRole('link', { name: /SSO/ })).not.toBeInTheDocument()
  })

  it('affiche le bouton SSO avec le nom choisi par le propriétaire, pointant vers /api/auth/oidc/login', async () => {
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: true, display_name: 'Authentik', logo: null })

    render(<LoginPage />)

    const lien = await screen.findByRole('link', { name: /Se connecter avec Authentik/ })
    expect(lien).toHaveAttribute('href', '/api/auth/oidc/login')
    // Sans logo configuré, le bouton reste exactement ce qu'il était avant le
    // 22/09/2026 : un libellé, pas d'image.
    expect(lien.querySelector('img')).toBeNull()
  })

  // Retour utilisateur du 22/09/2026 : « pouvoir ajouter un logo au bouton de
  // connexion OIDC, paramétrable dans les réglages ».
  it('affiche le logo posé dans les réglages À CÔTÉ du libellé, sans le remplacer', async () => {
    vi.mocked(api.getOidcStatus).mockResolvedValue({
      enabled: true,
      display_name: 'Authentik',
      logo: 'data:image/png;base64,AAA',
    })

    render(<LoginPage />)

    const lien = await screen.findByRole('link', { name: /Se connecter avec Authentik/ })
    const image = lien.querySelector('img')
    expect(image).toHaveAttribute('src', 'data:image/png;base64,AAA')
    // Décorative : le libellé juste à côté dit déjà où mène le bouton, un lecteur
    // d'écran annoncerait sinon deux fois la même chose.
    expect(image).toHaveAttribute('alt', '')
  })

  // ---------------------------------------------------------------------------
  // Retour utilisateur du 14/09/2026, après deux correctifs insuffisants : « quand
  // je me fais déconnecter sur mon téléphone, il garde en cache l'application mais
  // sans le bouton Authentik, je ne peux plus me connecter et je suis obligé de
  // vider le cache ».
  //
  // La cause n'était ni le service worker ni le jeton expiré : c'est que l'échec de
  // la vérification du SSO était SILENCIEUX par choix. « Le SSO n'est pas configuré »
  // et « je n'ai pas réussi à le demander » produisaient le même écran — un écran de
  // connexion amputé de son seul moyen de connexion, sans rien qui l'explique.
  // ---------------------------------------------------------------------------

  it("dit qu'il n'a pas pu vérifier, au lieu de masquer le bouton SSO en silence", async () => {
    vi.mocked(api.getOidcStatus).mockRejectedValue(new Error('Panne réseau'))

    render(<LoginPage />)

    expect(await screen.findByText(/Impossible de joindre le serveur/)).toBeInTheDocument()
    // L'utilisateur garde une prise sur la situation : trois issues, dont celle
    // qu'il devait jusqu'ici aller chercher dans les réglages de son téléphone.
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Vider le cache de l'application" })).toBeInTheDocument()
    // Pas de « Recharger la page » : il serait trompeur, le service worker
    // resservirait la même coquille depuis son cache.
    expect(screen.queryByRole('button', { name: /Recharger/ })).not.toBeInTheDocument()
  })

  it('« Réessayer » rétablit le bouton SSO sans rien vider', async () => {
    vi.mocked(api.getOidcStatus)
      .mockRejectedValueOnce(new Error('Panne réseau'))
      .mockResolvedValueOnce({ enabled: true, display_name: 'Authentik', logo: null })

    render(<LoginPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }))

    expect(await screen.findByRole('link', { name: /Se connecter avec Authentik/ })).toBeInTheDocument()
    expect(screen.queryByText(/Impossible de joindre le serveur/)).not.toBeInTheDocument()
  })

  it("reconnaît un portail d'authentification qui a repris la main, et se recharge pour lui rendre la main", async () => {
    // Authentik en « proxy provider » dont la session a expiré : il répond sa propre
    // page de connexion en HTML, avec un code 200. Reproduit en conditions réelles
    // avant correction — `res.json()` explosait alors sur `<!doctype`, et l'échec
    // était avalé en silence.
    //
    // Le service worker sert toute navigation depuis son précache : un simple
    // `reload()` ne contacte donc JAMAIS le serveur, et le portail ne peut pas
    // rediriger — c'est ce qui enfermait l'utilisateur. Le correctif désinstalle le
    // service worker AVANT de recharger, pour que la navigation suivante parte
    // vraiment au réseau.
    const rechargements = vi.fn()
    const vraieLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...vraieLocation, reload: rechargements },
    })
    vi.mocked(api.getOidcStatus).mockRejectedValue(new ErreurPortailAuthentification())

    try {
      render(<LoginPage />)

      await waitFor(() => expect(rechargements).toHaveBeenCalledTimes(1))
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: vraieLocation })
    }
  })

  it("ne recharge automatiquement qu'UNE fois, jamais en boucle", async () => {
    // Un rechargement automatique évite à l'utilisateur d'agir. Mais si le portail
    // renvoie vers une application qui échoue encore, boucler serait bien pire que
    // la panne d'origine : la seconde fois, on explique et on laisse la main.
    const rechargements = vi.fn()
    const vraieLocation = window.location
    // Restauré en `finally` : sans ça, un `window.location` figé fuiterait sur les
    // tests suivants, qui lisent `window.location.search` (le cas `?oidc_error=`).
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...vraieLocation, reload: rechargements },
    })
    sessionStorage.setItem('patrimoine:rechargement-portail', '1')
    vi.mocked(api.getOidcStatus).mockRejectedValue(new ErreurPortailAuthentification())

    try {
      render(<LoginPage />)

      expect(await screen.findByText(/portail d.authentification a expiré/)).toBeInTheDocument()
      expect(rechargements).not.toHaveBeenCalled()
      // Le bouton propose bien la seule manœuvre qui sorte de l'impasse.
      expect(screen.getByRole('button', { name: 'Se reconnecter' })).toBeInTheDocument()
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: vraieLocation })
    }
  })

  it("affiche le message d'erreur porté par ?oidc_error= puis nettoie l'URL", async () => {
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: false, display_name: 'SSO', logo: null })
    window.history.replaceState(null, '', '/login?oidc_error=Connexion%20SSO%20refus%C3%A9e')

    render(<LoginPage />)

    expect(screen.getByText('Connexion SSO refusée')).toBeInTheDocument()
    await vi.waitFor(() => expect(window.location.search).toBe(''))
  })
})
