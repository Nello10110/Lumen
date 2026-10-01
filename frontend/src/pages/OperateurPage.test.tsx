import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiOperateur } from '../api/client'
import type { FoyerOperateur, ReglagesInstallation, ScheduledJob } from '../api/types'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import OperateurPage from './OperateurPage'

vi.mock('../api/client', () => ({
  apiOperateur: {
    getReglagesInstallation: vi.fn(),
    updateReglagesInstallation: vi.fn(),
    listFoyers: vi.fn(),
    suspendreFoyer: vi.fn(),
    reactiverFoyer: vi.fn(),
    supprimerFoyer: vi.fn(),
    listComptesDuFoyer: vi.fn(),
    designerProprietaire: vi.fn(),
    listInvitationsFoyer: vi.fn(),
    createInvitationFoyer: vi.fn(),
    revoquerInvitationFoyer: vi.fn(),
    listComptesSansFoyer: vi.fn(),
    supprimerCompteSansFoyer: vi.fn(),
    listJobs: vi.fn(),
    updateJob: vi.fn(),
    runJobNow: vi.fn(),
    getRefreshStatus: vi.fn(),
    getLogoConnexionSso: vi.fn(),
    setLogoConnexionSsoUrl: vi.fn(),
    uploadLogoConnexionSso: vi.fn(),
    deleteLogoConnexionSso: vi.fn(),
    getJournalAcces: vi.fn(),
  },
}))

const SQLITE: ReglagesInstallation = {
  mode_naissance_foyers: 'ferme',
  sso_cree_son_foyer: true,
  creation_foyer_par_compte_sans_foyer: true,
  moteur: 'sqlite',
  separation_par_la_base: false,
}

const POSTGRES: ReglagesInstallation = { ...SQLITE, moteur: 'postgresql', separation_par_la_base: true }

const DUPONT: FoyerOperateur = {
  id: 10,
  nom: 'Famille Dupont',
  langue: 'fr',
  statut: 'actif',
  cree_le: '2026-09-01T10:00:00',
  suspendu_le: null,
  derniere_activite: null,
  proprietaire: 'alice',
  nombre_comptes: 2,
  confirmation_attendue: 'Famille Dupont',
}

const JOB: ScheduledJob = {
  job_key: 'sauvegarde_chiffree',
  enabled: true,
  intervalle_heures: 24,
  derniere_execution: null,
  dernier_statut: null,
  dernier_message: null,
}

function rendre(url = '/operateur', logout = vi.fn()) {
  const valeur: AuthContextValue = {
    user: { id: 99, username: 'admin', role: null, est_operateur: true, onboarding_termine: false, holdings_sans_compte: 0 },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout,
    completeOnboarding: async () => {},
    refetchUser: async () => {},
  }
  render(
    <MemoryRouter initialEntries={[url]}>
      <AuthContext.Provider value={valeur}>
        <OperateurPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return { logout }
}

describe("OperateurPage — console de l'opérateur (backlog § BK.2d)", () => {
  beforeEach(() => {
    vi.mocked(apiOperateur.getReglagesInstallation).mockResolvedValue(SQLITE)
    vi.mocked(apiOperateur.listFoyers).mockResolvedValue([DUPONT])
    vi.mocked(apiOperateur.listInvitationsFoyer).mockResolvedValue([])
    vi.mocked(apiOperateur.listComptesSansFoyer).mockResolvedValue([])
    vi.mocked(apiOperateur.listJobs).mockResolvedValue([JOB])
    vi.mocked(apiOperateur.getJournalAcces).mockResolvedValue([])
    vi.mocked(apiOperateur.getLogoConnexionSso).mockResolvedValue({ logo: null })
    vi.mocked(apiOperateur.suspendreFoyer).mockReset()
  })

  it("affiche l'en-tête, la liste des foyers, les liens de création et les comptes sans foyer", async () => {
    rendre()

    expect(screen.getByRole('heading', { name: "Console de l'installation" })).toBeInTheDocument()
    expect(screen.getByText('Connecté en tant qu\'opérateur : admin.')).toBeInTheDocument()
    expect(await screen.findByText('Famille Dupont')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Créer un foyer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comptes sans foyer' })).toBeInTheDocument()
    expect(await screen.findByText('Aucun compte sans foyer.')).toBeInTheDocument()
  })

  it("suspend un foyer depuis la liste", async () => {
    vi.mocked(apiOperateur.suspendreFoyer).mockResolvedValue({ ...DUPONT, statut: 'suspendu' })
    rendre()

    fireEvent.click(within((await screen.findByText('Famille Dupont')).closest('li') as HTMLElement).getByRole('button', { name: 'Suspendre' }))

    expect(await screen.findByText('Suspendu')).toBeInTheDocument()
    expect(apiOperateur.suspendreFoyer).toHaveBeenCalledWith(10)
  })

  it("sous SQLite, l'avertissement de séparation est affiché en permanence, sur chaque onglet", async () => {
    rendre()

    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent("La séparation des foyers n'est assurée que par l'application")
    expect(alerte).toHaveTextContent('SQLite')

    for (const onglet of ['Installation', 'Tâches planifiées', "Journal d'accès"]) {
      fireEvent.click(screen.getByRole('tab', { name: onglet }))
      expect(screen.getByRole('alert')).toHaveTextContent("La séparation des foyers n'est assurée que par l'application")
    }
    // Pas de bouton pour le fermer.
    expect(within(screen.getByRole('alert')).queryByRole('button')).not.toBeInTheDocument()
  })

  it("sous PostgreSQL, aucun avertissement de séparation", async () => {
    vi.mocked(apiOperateur.getReglagesInstallation).mockResolvedValue(POSTGRES)
    rendre()

    await screen.findByText('Famille Dupont')
    await vi.waitFor(() => expect(apiOperateur.getReglagesInstallation).toHaveBeenCalled())
    expect(screen.queryByText(/La séparation des foyers n'est assurée que par l'application/)).not.toBeInTheDocument()
  })

  it("l'onglet Installation porte les réglages de naissance des foyers et le logo SSO, branchés sur la route de l'opérateur", async () => {
    rendre('/operateur?onglet=installation')

    expect(await screen.findByRole('radio', { name: 'Fermé' })).toBeChecked()
    expect(await screen.findByRole('heading', { name: 'Logo du bouton de connexion SSO' })).toBeInTheDocument()
    expect(apiOperateur.getLogoConnexionSso).toHaveBeenCalled()
  })

  it("l'onglet Tâches planifiées réutilise JobCard sur /operateur/jobs", async () => {
    vi.mocked(apiOperateur.updateJob).mockResolvedValue({ ...JOB, enabled: false })
    rendre('/operateur?onglet=taches')

    expect(await screen.findByText('Sauvegarde chiffrée')).toBeInTheDocument()
    expect(apiOperateur.listJobs).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Activé' }))

    await vi.waitFor(() => expect(apiOperateur.updateJob).toHaveBeenCalledWith('sauvegarde_chiffree', { enabled: false, intervalle_heures: 24 }))
  })

  it("l'onglet Journal lit le journal d'accès complet de l'installation", async () => {
    vi.mocked(apiOperateur.getJournalAcces).mockResolvedValue([
      { id: 1, timestamp: '2026-10-01T09:00:00', username_saisi: 'inconnu', ip: '10.0.0.4', action: 'login', resultat: 'echec', raison: 'compte_inconnu' },
      { id: 2, timestamp: '2026-10-01T09:05:00', username_saisi: 'alice', ip: '10.0.0.5', action: 'liaison_sso', resultat: 'succes', raison: null },
    ])
    rendre('/operateur?onglet=journal')

    expect(await screen.findByText(/inconnu · connexion · 10\.0\.0\.4/)).toBeInTheDocument()
    expect(screen.getByText(/alice · liaison SSO · 10\.0\.0\.5/)).toBeInTheDocument()
    expect(screen.getByText(/tentatives sur un identifiant inconnu comprises/)).toBeInTheDocument()
    expect(apiOperateur.getJournalAcces).toHaveBeenCalledWith(1)
  })

  it('la déconnexion est accessible', async () => {
    const { logout } = rendre()

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(logout).toHaveBeenCalledTimes(1)
    await screen.findByText('Famille Dupont')
  })
})
