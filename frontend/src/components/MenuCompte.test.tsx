import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import MenuCompte from './MenuCompte'

vi.mock('../api/client', () => ({
  api: {
    apercuSuppressionCompte: vi.fn(),
    supprimerMonCompte: vi.fn(),
    // Liaison SSO (§ BK.2d) : interrogée pour un membre ou un invité seulement.
    getOidcStatus: vi.fn(),
    lierSso: vi.fn(),
    delierSso: vi.fn(),
  },
}))

function renderMenu(user: Partial<NonNullable<AuthContextValue['user']>> = {}, refetchUser = vi.fn().mockResolvedValue(undefined)) {
  const logout = vi.fn()
  const valeur: AuthContextValue = {
    user: { id: 1, username: 'testeur', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0, ...user },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout,
    completeOnboarding: async () => {},
    refetchUser,
  }
  const resultat = render(
    <MemoryRouter>
      <AuthContext.Provider value={valeur}>
        <MenuCompte />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return { logout, ...resultat }
}

describe('MenuCompte (backlog 2.K.2 / 2.K.7)', () => {
  it('est fermé par défaut', () => {
    renderMenu()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  // Le thème a quitté ce menu à l'étape 3 de la refonte : il vit dans la barre de
  // contrôles, visible en permanence.
  it("s'ouvre au clic sur l'avatar et propose Import, Réglages, Aide et la déconnexion", () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'testeur' }))

    expect(screen.getByRole('menu', { name: 'Menu du compte' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute('href', '/import')
    expect(screen.getByRole('menuitem', { name: 'Réglages' })).toHaveAttribute('href', '/reglages')
    expect(screen.getByRole('menuitem', { name: 'Aide' })).toHaveAttribute('href', '/aide')
    expect(screen.queryByRole('button', { name: /Thème/ })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Se déconnecter/ })).toBeInTheDocument()
  })

  it("la déconnexion ne se déclenche jamais depuis le bouton avatar lui-même, seulement depuis l'item du menu", () => {
    const { logout } = renderMenu()
    const avatar = screen.getByRole('button', { name: 'testeur' })

    fireEvent.click(avatar)
    expect(logout).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('menuitem', { name: /Se déconnecter/ }))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  // Backlog § BK.2c : tout compte connecté peut supprimer le sien, quel que soit son rôle
  // (et même sans foyer, depuis l'écran « aucun foyer », qui réutilise la même fenêtre).
  it('« Supprimer mon compte » ouvre la fenêtre de suppression, sans supprimer quoi que ce soit', async () => {
    vi.mocked(api.apercuSuppressionCompte).mockResolvedValue({
      confirmation_attendue: 'testeur',
      foyers_supprimes: [],
      foyers_quittes: [],
      foyers_bloquants: [],
      peut_supprimer: true,
    })
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'testeur' }))

    fireEvent.click(screen.getByRole('menuitem', { name: 'Supprimer mon compte' }))

    expect(await screen.findByRole('heading', { name: 'Supprimer mon compte ?' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(api.supprimerMonCompte).not.toHaveBeenCalled()
  })

  it('se ferme au clic extérieur', async () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'testeur' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  it('se ferme avec la touche Échap', async () => {
    renderMenu()
    fireEvent.click(screen.getByRole('button', { name: 'testeur' }))

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  })

  // Backlog § BK.2d : un membre ou un invité n'a pas Réglages, où le propriétaire trouve « Lier mon
  // compte SSO » : l'entrée est dans son menu du compte.
  describe('« Connexion SSO… » (membre ou invité)', () => {
    const assign = vi.fn()

    beforeEach(() => {
      vi.mocked(api.getOidcStatus).mockReset().mockResolvedValue({ enabled: true, display_name: 'Authentik', logo: null })
      vi.mocked(api.lierSso).mockReset()
      vi.mocked(api.delierSso).mockReset()
      assign.mockReset()
      vi.stubGlobal('location', { ...window.location, assign })
    })

    it.each(['membre', 'invite'] as const)('%s : l\'entrée est proposée quand le SSO est configuré, et lie le compte', async (role) => {
      vi.mocked(api.lierSso).mockResolvedValue({ url: 'https://sso.exemple.fr/autoriser?state=abc' })
      renderMenu({ role })
      fireEvent.click(screen.getByRole('button', { name: 'testeur' }))

      fireEvent.click(await screen.findByRole('menuitem', { name: 'Connexion SSO…' }))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      expect(await screen.findByRole('heading', { name: 'Connexion SSO' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Lier mon compte SSO' }))

      await waitFor(() => expect(assign).toHaveBeenCalledWith('https://sso.exemple.fr/autoriser?state=abc'))
    })

    it('un compte lié propose de se délier, puis recharge l\'utilisateur', async () => {
      vi.mocked(api.delierSso).mockResolvedValue({ id: 1, username: 'testeur', role: 'membre', onboarding_termine: true, holdings_sans_compte: 0 })
      const refetchUser = vi.fn().mockResolvedValue(undefined)
      renderMenu({ role: 'membre', sso_lie: true }, refetchUser)
      fireEvent.click(screen.getByRole('button', { name: 'testeur' }))

      fireEvent.click(await screen.findByRole('menuitem', { name: 'Connexion SSO…' }))
      fireEvent.click(await screen.findByRole('button', { name: 'Délier mon compte SSO' }))

      await waitFor(() => expect(refetchUser).toHaveBeenCalledTimes(1))
      expect(api.delierSso).toHaveBeenCalledTimes(1)
    })

    it('la fenêtre se ferme avec « Fermer »', async () => {
      renderMenu({ role: 'membre' })
      fireEvent.click(screen.getByRole('button', { name: 'testeur' }))
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Connexion SSO…' }))

      fireEvent.click(await screen.findByRole('button', { name: 'Fermer' }))

      await waitFor(() => expect(screen.queryByRole('heading', { name: 'Connexion SSO' })).not.toBeInTheDocument())
    })

    it("pas d'entrée quand le SSO n'est pas configuré", async () => {
      vi.mocked(api.getOidcStatus).mockResolvedValue({ enabled: false, display_name: 'SSO', logo: null })
      renderMenu({ role: 'membre' })
      await waitFor(() => expect(api.getOidcStatus).toHaveBeenCalled())
      fireEvent.click(screen.getByRole('button', { name: 'testeur' }))

      expect(screen.queryByRole('menuitem', { name: 'Connexion SSO…' })).not.toBeInTheDocument()
    })

    it("le propriétaire a la carte de Réglages : ni entrée de menu, ni appel au serveur", () => {
      renderMenu({ role: 'proprietaire' })
      fireEvent.click(screen.getByRole('button', { name: 'testeur' }))

      expect(screen.queryByRole('menuitem', { name: 'Connexion SSO…' })).not.toBeInTheDocument()
      expect(api.getOidcStatus).not.toHaveBeenCalled()
    })
  })
})
