import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api/client'
import App from './App'

/** Un compte `est_operateur` (backlog § BK.2d) ne voit que la console : aucune barre
 * latérale, aucune page de foyer, toute autre adresse y renvoie, et la langue du foyer (il n'en
 * a pas) n'écrase pas celle de l'appareil. Fichier à part de `App.test.tsx` : ce dernier
 * remplace toutes les pages par des coquilles vides, ici la console est la vraie. */
vi.mock('./api/client', () => ({
  api: {
    getMe: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    getOidcStatus: vi.fn().mockResolvedValue({ enabled: false, display_name: 'SSO' }),
    listJalons: vi.fn().mockResolvedValue([]),
    getPatrimoineHistory: vi.fn().mockResolvedValue({ points: [] }),
  },
  apiOperateur: {
    getReglagesInstallation: vi.fn().mockResolvedValue({
      mode_naissance_foyers: 'ferme',
      sso_cree_son_foyer: true,
      creation_foyer_par_compte_sans_foyer: true,
      moteur: 'postgresql',
      separation_par_la_base: true,
    }),
    listFoyers: vi.fn().mockResolvedValue([]),
    listInvitationsFoyer: vi.fn().mockResolvedValue([]),
    listComptesSansFoyer: vi.fn().mockResolvedValue([]),
    getRefreshStatus: vi.fn(),
  },
}))

const OPERATEUR = {
  id: 99,
  username: 'admin',
  role: null,
  est_operateur: true,
  onboarding_termine: false,
  holdings_sans_compte: 0,
  // Un compte sans foyer porte la langue par défaut du serveur, pas celle d'un foyer.
  langue: 'en',
}

function rendre(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  )
}

describe("App — l'opérateur ne voit que sa console", () => {
  beforeEach(() => {
    localStorage.setItem('patrimoine_auth_token', 'jeton-operateur')
    vi.mocked(api.getMe).mockResolvedValue(OPERATEUR)
  })

  it('arrive sur /operateur, sans barre latérale ni écran de foyer', async () => {
    rendre('/operateur')

    expect(await screen.findByRole('heading', { name: "Console de l'installation" })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: "Vous n'appartenez à aucun foyer" })).not.toBeInTheDocument()
  })

  it.each(['/', '/patrimoine', '/reglages', '/analyse', '/une-page-qui-nexiste-pas'])(
    'renvoie %s vers la console',
    async (adresse) => {
      rendre(adresse)

      expect(await screen.findByRole('heading', { name: "Console de l'installation" })).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Navigation principale' })).not.toBeInTheDocument()
    },
  )

  it("garde la langue de l'appareil : celle que porte UserOut.langue pour un compte sans foyer ne s'impose pas", async () => {
    rendre('/operateur')

    // Titre en français alors que `user.langue` vaut « en ».
    expect(await screen.findByRole('heading', { name: "Console de l'installation" })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('fr')
  })

  it("pose le titre de l'onglet de la console, que le titre des écrans de foyer n'écrase pas", async () => {
    rendre('/operateur')

    await screen.findByRole('heading', { name: "Console de l'installation" })
    expect(document.title).toBe("Console de l'installation · Lumen")
  })
})
