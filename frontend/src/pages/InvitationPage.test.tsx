import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { rechargerApplication } from '../auth/changementFoyer'
import { invitationGardee } from '../auth/invitationEnAttente'
import { clearToken, getToken, setToken } from '../auth/tokenStorage'
import InvitationPage from './InvitationPage'

// Page PUBLIQUE (backlog § BK.2b), montée hors d'`AuthProvider` : ce fichier n'en fournit
// aucun, ce qui verrouille que la page ne dépend d'aucun contexte d'authentification.
vi.mock('../api/client', () => ({
  api: {
    consulterInvitation: vi.fn(),
    accepterInvitationNouveauCompte: vi.fn(),
    accepterInvitation: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    getOidcStatus: vi.fn(),
  },
}))

vi.mock('../auth/changementFoyer', () => ({ rechargerApplication: vi.fn() }))

const APERCU = { foyer_nom: 'Famille Dupont', role: 'membre' as const, libelle: 'Sophie', langue: 'fr', cree_un_foyer: false }

function utilisateur(overrides = {}) {
  return {
    id: 7,
    username: 'sophie',
    role: 'membre' as const,
    onboarding_termine: true,
    holdings_sans_compte: 0,
    foyer_nom: 'Famille Dupont',
    ...overrides,
  }
}

describe('InvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    clearToken()
    window.history.replaceState(null, '', '/invitation#jeton_de-test123')
    vi.mocked(api.consulterInvitation).mockResolvedValue(APERCU)
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: false, display_name: 'SSO', logo: null })
    vi.mocked(api.logout).mockResolvedValue(undefined)
  })

  it('lit le jeton dans le fragment, le garde en sessionStorage et retire le fragment de l’URL', async () => {
    render(<InvitationPage />)

    await screen.findByText(/Famille Dupont vous invite/)
    expect(api.consulterInvitation).toHaveBeenCalledWith('jeton_de-test123')
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/invitation')
    expect(invitationGardee()).toEqual({ jeton: 'jeton_de-test123', apresSso: false })
  })

  it('après un rechargement (fragment déjà retiré), reprend le jeton gardé', async () => {
    sessionStorage.setItem('lumen.invitation-en-attente', JSON.stringify({ jeton: 'garde_avant', apresSso: false }))
    window.history.replaceState(null, '', '/invitation')

    render(<InvitationPage />)

    await screen.findByText(/Famille Dupont vous invite/)
    expect(api.consulterInvitation).toHaveBeenCalledWith('garde_avant')
  })

  it('affiche le rôle proposé et le libellé de l’invitation', async () => {
    render(<InvitationPage />)

    expect(await screen.findByText(/Rôle proposé : Membre du foyer/)).toBeInTheDocument()
    expect(screen.getByText('Invitation destinée à : Sophie')).toBeInTheDocument()
  })

  it('un jeton refusé (404) affiche un message clair, sans formulaire', async () => {
    vi.mocked(api.consulterInvitation).mockRejectedValue(Object.assign(new Error('Invitation introuvable'), { status: 404 }))

    render(<InvitationPage />)

    expect(await screen.findByText(/invalide, expiré ou déjà utilisé/)).toBeInTheDocument()
    expect(screen.queryByLabelText("Nom d'utilisateur")).not.toBeInTheDocument()
  })

  it('une autre erreur (429...) garde le message du serveur', async () => {
    vi.mocked(api.consulterInvitation).mockRejectedValue(Object.assign(new Error('Trop de tentatives.'), { status: 429 }))

    render(<InvitationPage />)

    expect(await screen.findByText('Trop de tentatives.')).toBeInTheDocument()
  })

  it('sans jeton (ni fragment ni stockage), affiche le lien invalide sans appeler le serveur', async () => {
    window.history.replaceState(null, '', '/invitation')

    render(<InvitationPage />)

    expect(await screen.findByText(/invalide, expiré ou déjà utilisé/)).toBeInTheDocument()
    expect(api.consulterInvitation).not.toHaveBeenCalled()
  })

  it('un fragment qui n’est pas un jeton est traité comme un lien invalide', async () => {
    window.history.replaceState(null, '', '/invitation#token=%%%')

    render(<InvitationPage />)

    expect(await screen.findByText(/invalide, expiré ou déjà utilisé/)).toBeInTheDocument()
    expect(api.consulterInvitation).not.toHaveBeenCalled()
  })

  it('créer un compte : refuse deux mots de passe différents sans appeler le serveur', async () => {
    render(<InvitationPage />)
    await screen.findByText(/Famille Dupont vous invite/)

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'sophie' } })
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'mot-de-passe-1' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'mot-de-passe-2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte et rejoindre le foyer' }))

    expect(await screen.findByText('Les deux mots de passe ne sont pas identiques.')).toBeInTheDocument()
    expect(api.accepterInvitationNouveauCompte).not.toHaveBeenCalled()
  })

  it('créer un compte : ouvre la session, oublie le jeton et montre l’accueil du foyer', async () => {
    vi.mocked(api.accepterInvitationNouveauCompte).mockResolvedValue({ token: 'session-neuve', user: utilisateur() })

    render(<InvitationPage />)
    await screen.findByText(/Famille Dupont vous invite/)

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'sophie' } })
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'mot-de-passe-1' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'mot-de-passe-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte et rejoindre le foyer' }))

    await screen.findByRole('heading', { name: 'Bienvenue dans le foyer Famille Dupont' })
    expect(api.accepterInvitationNouveauCompte).toHaveBeenCalledWith('jeton_de-test123', 'sophie', 'mot-de-passe-1', 'fr')
    expect(getToken()).toBe('session-neuve')
    expect(invitationGardee()).toBeNull()
    expect(screen.getByText('Votre rôle dans ce foyer : Membre du foyer.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: "Ouvrir l'application" }))
    expect(rechargerApplication).toHaveBeenCalled()
  })

  it('un invité voit la description en lecture seule', async () => {
    vi.mocked(api.accepterInvitationNouveauCompte).mockResolvedValue({ token: 't', user: utilisateur({ role: 'invite' }) })

    render(<InvitationPage />)
    await screen.findByText(/Famille Dupont vous invite/)
    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'sophie' } })
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'mot-de-passe-1' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'mot-de-passe-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte et rejoindre le foyer' }))

    expect(await screen.findByText(/en lecture seule/)).toBeInTheDocument()
  })

  it('« J’ai déjà un compte » : connecte puis accepte automatiquement le jeton gardé', async () => {
    vi.mocked(api.login).mockResolvedValue({ token: 'session-existante', user: utilisateur({ foyers: [] }) })
    vi.mocked(api.accepterInvitation).mockResolvedValue(utilisateur())

    render(<InvitationPage />)
    await screen.findByText(/Famille Dupont vous invite/)

    fireEvent.click(screen.getByRole('button', { name: "J'ai déjà un compte" }))
    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'sophie' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'mot-de-passe-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Me connecter et rejoindre le foyer' }))

    await screen.findByRole('heading', { name: 'Bienvenue dans le foyer Famille Dupont' })
    expect(api.login).toHaveBeenCalledWith('sophie', 'mot-de-passe-1')
    expect(api.accepterInvitation).toHaveBeenCalledWith('jeton_de-test123', 'fr')
    expect(getToken()).toBe('session-existante')
    expect(invitationGardee()).toBeNull()
  })

  it('« J’ai déjà un compte » : si l’acceptation échoue (déjà membre), reste connecté avec le message', async () => {
    vi.mocked(api.login).mockResolvedValue({ token: 'session-existante', user: utilisateur() })
    vi.mocked(api.accepterInvitation).mockRejectedValue(new Error('Vous appartenez déjà à ce foyer.'))

    render(<InvitationPage />)
    await screen.findByText(/Famille Dupont vous invite/)

    fireEvent.click(screen.getByRole('button', { name: "J'ai déjà un compte" }))
    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'sophie' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'mot-de-passe-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Me connecter et rejoindre le foyer' }))

    expect(await screen.findByText('Vous appartenez déjà à ce foyer.')).toBeInTheDocument()
    expect(screen.getByText('Vous êtes connecté en tant que sophie.')).toBeInTheDocument()
  })

  it('un compte déjà connecté accepte d’un clic', async () => {
    setToken('session-en-cours')
    vi.mocked(api.getMe).mockResolvedValue(utilisateur({ username: 'paul' }))
    vi.mocked(api.accepterInvitation).mockResolvedValue(utilisateur())

    render(<InvitationPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Rejoindre ce foyer' }))

    await screen.findByRole('heading', { name: 'Bienvenue dans le foyer Famille Dupont' })
    expect(api.accepterInvitation).toHaveBeenCalledWith('jeton_de-test123', 'fr')
    expect(screen.queryByLabelText("Nom d'utilisateur")).not.toBeInTheDocument()
  })

  it('un jeton de session périmé laisse la page anonyme', async () => {
    setToken('session-perimee')
    vi.mocked(api.getMe).mockRejectedValue(new Error('Non authentifié'))

    render(<InvitationPage />)

    await screen.findByText(/Famille Dupont vous invite/)
    await waitFor(() => expect(api.getMe).toHaveBeenCalled())
    expect(screen.getByLabelText("Nom d'utilisateur")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rejoindre ce foyer' })).not.toBeInTheDocument()
  })

  it('le SSO, quand il est activé, arme le retour de connexion avec le jeton avant de partir', async () => {
    vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: true, display_name: 'Authentik', logo: null })

    render(<InvitationPage />)

    const lien = await screen.findByRole('link', { name: 'Continuer avec Authentik' })
    expect(lien).toHaveAttribute('href', '/api/auth/oidc/login?invitation=true')
    // Sans cela, jsdom tente la navigation réelle vers le fournisseur (non implémentée).
    lien.addEventListener('click', (e) => e.preventDefault())
    fireEvent.click(lien)
    expect(invitationGardee()).toEqual({ jeton: 'jeton_de-test123', apresSso: true })
  })

  it('sans SSO, aucun bouton de connexion externe', async () => {
    render(<InvitationPage />)

    await screen.findByText(/Famille Dupont vous invite/)
    expect(screen.queryByRole('link', { name: /Continuer avec/ })).not.toBeInTheDocument()
  })

  // Invitation à CRÉER un foyer (backlog § BK.2d).
  describe('invitation à créer un foyer', () => {
    const CREATION = { foyer_nom: null, role: 'proprietaire' as const, libelle: 'Famille Martin', langue: null, cree_un_foyer: true }

    beforeEach(() => {
      vi.mocked(api.consulterInvitation).mockResolvedValue(CREATION)
    })

    it('dit « créer votre foyer » au lieu de « rejoindre », sans nom de foyer', async () => {
      render(<InvitationPage />)

      expect(await screen.findByText('Vous êtes invité à créer votre foyer : vous en serez le propriétaire.')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Invitation à créer votre foyer' })).toBeInTheDocument()
      expect(screen.getByText('Invitation destinée à : Famille Martin')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Créer mon compte et mon foyer' })).toBeInTheDocument()
      expect(screen.queryByText(/rejoindre/i)).not.toBeInTheDocument()
      expect(document.title).toBe('Invitation à créer votre foyer · Lumen')
    })

    it("créer un compte envoie la langue de l'appareil et mène directement à l'application (propriétaire : pas d'accueil court)", async () => {
      vi.mocked(api.accepterInvitationNouveauCompte).mockResolvedValue({
        token: 'session-neuve',
        user: utilisateur({ role: 'proprietaire', onboarding_termine: false }),
      })
      render(<InvitationPage />)
      await screen.findByText(/en serez le propriétaire/)

      fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'martin' } })
      fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'mot-de-passe-1' } })
      fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'mot-de-passe-1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte et mon foyer' }))

      await waitFor(() => expect(rechargerApplication).toHaveBeenCalledTimes(1))
      expect(api.accepterInvitationNouveauCompte).toHaveBeenCalledWith('jeton_de-test123', 'martin', 'mot-de-passe-1', 'fr')
      expect(getToken()).toBe('session-neuve')
      expect(invitationGardee()).toBeNull()
      expect(screen.queryByRole('heading', { name: /^Bienvenue dans/ })).not.toBeInTheDocument()
    })

    it('un compte déjà connecté crée son foyer d’un clic, avec la langue de l’appareil', async () => {
      setToken('session-existante')
      vi.mocked(api.getMe).mockResolvedValue(utilisateur())
      vi.mocked(api.accepterInvitation).mockResolvedValue(utilisateur({ role: 'proprietaire', onboarding_termine: false }))
      render(<InvitationPage />)

      fireEvent.click(await screen.findByRole('button', { name: 'Créer mon foyer' }))

      await waitFor(() => expect(rechargerApplication).toHaveBeenCalledTimes(1))
      expect(api.accepterInvitation).toHaveBeenCalledWith('jeton_de-test123', 'fr')
    })

    it('« J’ai déjà un compte » propose de se connecter et créer le foyer', async () => {
      render(<InvitationPage />)
      await screen.findByText(/en serez le propriétaire/)

      fireEvent.click(screen.getByRole('button', { name: "J'ai déjà un compte" }))

      expect(screen.getByRole('button', { name: 'Me connecter et créer mon foyer' })).toBeInTheDocument()
    })

    it('affiche le refus du serveur (un opérateur ne crée pas de foyer)', async () => {
      setToken('session-operateur')
      vi.mocked(api.getMe).mockResolvedValue(utilisateur())
      vi.mocked(api.accepterInvitation).mockRejectedValue(
        new Error("Un compte opérateur n'appartient à aucun foyer et ne peut pas en rejoindre ni en créer."),
      )
      render(<InvitationPage />)

      fireEvent.click(await screen.findByRole('button', { name: 'Créer mon foyer' }))

      expect(await screen.findByText(/compte opérateur n'appartient à aucun foyer/)).toBeInTheDocument()
      expect(rechargerApplication).not.toHaveBeenCalled()
    })
  })
})
