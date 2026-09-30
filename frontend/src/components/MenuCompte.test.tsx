import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import MenuCompte from './MenuCompte'

vi.mock('../api/client', () => ({ api: { apercuSuppressionCompte: vi.fn(), supprimerMonCompte: vi.fn() } }))

function renderMenu() {
  const logout = vi.fn()
  const valeur: AuthContextValue = {
    user: { id: 1, username: 'testeur', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0 },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout,
    completeOnboarding: async () => {},
    refetchUser: async () => {},
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
})
