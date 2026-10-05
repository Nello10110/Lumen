import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur, Session } from '../api/types'
import { etapesPourUtilisateur } from '../components/onboarding/steps'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import ReglagesPage from './ReglagesPage'

// La page est désormais organisée en onglets (retour utilisateur : trop de cartes
// empilées sur une seule colonne) — chaque groupe de tests ouvre l'onglet qui
// contient la carte visée avant d'interagir avec elle. `useSearchParams` (sélection
// de l'onglet portée par l'URL) exige un routeur. `AuthContext.Provider` : la page
// lit désormais `useAuth()` (bouton "Revoir l'assistant de bienvenue", réservé au
// propriétaire) — même patron de contexte factice que `Sidebar.test.tsx`.
const utilisateurFactice: AuthContextValue = {
  user: { id: 1, username: 'testeur', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0 },
  loading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  completeOnboarding: async () => {},
  refetchUser: async () => {},
}

function renderReglages() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={utilisateurFactice}>
        <ReglagesPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

function ouvrirOnglet(nom: string) {
  fireEvent.click(screen.getByRole('tab', { name: nom }))
}

// Langage simple (backlog § AG.1) : préférence purement client (localStorage),
// jamais backend — `ReglagesPage` lit `usePreferencesAffichage()` directement,
// même patron de double que les autres pages qui n'en testent pas la mécanique
// (déjà couverte par `PreferencesAffichageContext`), seulement son câblage ici.
const toggleLangageSimpleMock = vi.fn()
vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ langageSimple: false, toggleLangageSimple: toggleLangageSimpleMock }),
}))

// Ce fichier ne verrouille que la section « Membres du foyer » (backlog 2.L.1) — le reste
// de la page (préférences, tâches planifiées, export) est hors de son objet.
// Sessions/journal d'accès/comptes du foyer (backlog 2.L.2) : hors de l'objet de ce
// fichier, stubs neutres (listes vides) pour que les nouvelles cartes de la page ne
// fassent pas planter les tests existants sur « Membres du foyer ».
vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
    createDetenteur: vi.fn(),
    deleteDetenteur: vi.fn(),
    // Établissements (écran Comptes, backlog X.1) : `EtablissementsCard` est
    // montée dans le même onglet que les détenteurs — hors de l'objet des tests de
    // ce fichier, stub neutre par défaut (aucun établissement existant).
    listEtablissements: vi.fn().mockResolvedValue([]),
    createEtablissement: vi.fn(),
    updateEtablissement: vi.fn(),
    deleteEtablissement: vi.fn(),
    // Étape "Comptes" de l'assistant de bienvenue (backlog X.3), rejouable depuis
    // cet onglet (« Revoir l'assistant de bienvenue ») — hors de l'objet de ce
    // fichier, stubs neutres par défaut.
    listComptes: vi.fn().mockResolvedValue([]),
    createCompte: vi.fn(),
    deleteCompte: vi.fn(),
    getPreferences: vi.fn().mockResolvedValue({ methode_cout: 'cout_moyen_pondere', taux_imposition_pct: null }),
    updatePreferences: vi.fn(),
    // Nom du foyer / réinitialisation du foyer (revue du 05/09/2026) : hors de
    // l'objet des blocs de ce fichier, stubs neutres par défaut.
    updateFoyerNom: vi.fn(),
    effacerFoyer: vi.fn(),
    listJobs: vi.fn().mockResolvedValue([]),
    // Déclaration de patrimoine (backlog 2.Q.2) : hors de l'objet des autres blocs
    // de ce fichier, stubs neutres par défaut.
    listHoldings: vi.fn().mockResolvedValue([]),
    listLoans: vi.fn().mockResolvedValue([]),
    downloadDeclarationPatrimoine: vi.fn(),
    // Sauvegarde complète (backlog X.6) : `SauvegardeDonneesCard` est montée dans
    // l'onglet Général — hors de l'objet de ce fichier, stubs neutres.
    downloadExportDonnees: vi.fn(),
    apercuImportDonnees: vi.fn(),
    importerDonnees: vi.fn(),
    listSessions: vi.fn().mockResolvedValue([]),
    // Logo du bouton de connexion SSO (22/09/2026) : `LogoConnexionSsoCard` vit dans
    // l'onglet Sécurité, rendue pour de vrai par les tests ci-dessous.
    getLogoConnexionSso: vi.fn().mockResolvedValue({ logo: null }),
    // Liaison du compte au SSO (backlog § BK.2d) : `LiaisonSsoCard`, dans l'onglet Sécurité —
    // SSO non configuré par défaut, la carte n'apparaît pas.
    getOidcStatus: vi.fn().mockResolvedValue({ enabled: false, display_name: 'SSO', logo: null }),
    // Liens « créer votre foyer » d'un propriétaire (§ BK.2d) : `InviterCreationFoyerCard`.
    listInvitationsFoyer: vi.fn().mockResolvedValue([]),
    createInvitationFoyer: vi.fn(),
    revoquerInvitationFoyer: vi.fn(),
    // Compte opérateur (§ BK.2d) : `BandeauOperateur`.
    amorcerOperateur: vi.fn(),
    getAccessLog: vi.fn().mockResolvedValue([]),
    listHouseholdMembers: vi.fn().mockResolvedValue([]),
    // Invitations (backlog § BK.2b) : `SectionInvitations`, montée dans « Membres et
    // invitations » — hors de l'objet de ce fichier, liste vide.
    listInvitations: vi.fn().mockResolvedValue([]),
    createHouseholdMember: vi.fn(),
    updateHouseholdMember: vi.fn(),
    deleteHouseholdMember: vi.fn(),
    // Liens de partage (backlog 2.Q.1) : hors de l'objet des autres blocs de ce
    // fichier, stub neutre par défaut (aucun lien existant).
    listLiensPartage: vi.fn().mockResolvedValue([]),
    createLienPartage: vi.fn(),
    revokeLienPartage: vi.fn(),
    // Badges (backlog § AG.4) : `BadgesCard`, montée dans son propre onglet —
    // stub neutre par défaut (aucun jalon), les tests dédiés le surchargent.
    listJalons: vi.fn().mockResolvedValue([]),
  },
}))

function detenteur(overrides: Partial<Detenteur> = {}): Detenteur {
  return {
    id: 1,
    nom: 'Alice',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    ...overrides,
  }
}

describe('ReglagesPage — Membres du foyer (backlog 2.L.1)', () => {
  it("affiche un message quand aucun membre du foyer n'est déclaré", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    renderReglages()
    ouvrirOnglet('Membres du foyer')

    await screen.findByText('Aucun membre du foyer déclaré.')
  })

  it('liste les membres du foyer déclarés', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' }), detenteur({ id: 2, nom: 'Bob' })])
    renderReglages()
    ouvrirOnglet('Membres du foyer')

    await screen.findByText('Alice')
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('ajouter un membre du foyer appelle createDetenteur puis recharge la liste', async () => {
    // Onglet « Membres du foyer » isolé de "Comptes & sécurité" (`GestionFoyerCard`) : plus
    // qu'un seul consommateur de `listDetenteurs` monté à la fois, donc 2 valeurs
    // enfilées (chargement initial, puis rechargement après "Ajouter").
    vi.mocked(api.listDetenteurs).mockResolvedValueOnce([]).mockResolvedValue([detenteur({ nom: 'Bob' })])
    vi.mocked(api.createDetenteur).mockResolvedValue(detenteur({ nom: 'Bob' }))
    renderReglages()
    ouvrirOnglet('Membres du foyer')
    await screen.findByText('Aucun membre du foyer déclaré.')

    const formulaire = screen.getByPlaceholderText('Alice').closest('form')!
    fireEvent.change(screen.getByPlaceholderText('Alice'), { target: { value: 'Bob' } })
    // Bouton "Ajouter" ambigu depuis l'ajout de `EtablissementsCard` dans le même
    // onglet (écran Comptes, backlog X.1) : on cible celui du formulaire détenteur.
    fireEvent.click(within(formulaire).getByRole('button', { name: 'Ajouter' }))

    await screen.findByText('Bob')
    expect(api.createDetenteur).toHaveBeenCalledWith('Bob')
  })

  it('supprimer un membre du foyer appelle deleteDetenteur puis recharge la liste', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValueOnce([detenteur({ nom: 'Alice' })]).mockResolvedValue([])
    vi.mocked(api.deleteDetenteur).mockResolvedValue({ ok: true })
    renderReglages()
    ouvrirOnglet('Membres du foyer')
    await screen.findByText('Alice')

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    await screen.findByText('Aucun membre du foyer déclaré.')
    expect(api.deleteDetenteur).toHaveBeenCalledWith(1)
  })

  it('Réessayer relance listDetenteurs après un échec', async () => {
    vi.mocked(api.listDetenteurs).mockRejectedValueOnce(new Error('panne détenteurs'))
    renderReglages()
    ouvrirOnglet('Membres du foyer')
    await screen.findByText('panne détenteurs')

    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' })])
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    await screen.findByText('Alice')
  })
})

function session(overrides: Partial<Session> = {}): Session {
  return {
    id_session: 'sess-1',
    created_at: '2026-08-21T09:00:00',
    expires_at: '2026-09-20T09:00:00',
    ip: '192.0.2.1',
    user_agent: 'Firefox',
    derniere_utilisation: '2026-08-21T10:00:00',
    est_courante: false,
    ...overrides,
  }
}

describe('ReglagesPage — Sessions actives, erreur avec action de reprise (backlog 2.K.5)', () => {
  it('Réessayer relance listSessions après un échec', async () => {
    vi.mocked(api.listSessions).mockRejectedValueOnce(new Error('panne sessions'))
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')
    await screen.findByText('panne sessions')

    vi.mocked(api.listSessions).mockResolvedValueOnce([session()])
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    await screen.findByText('192.0.2.1')
  })
})

describe('ReglagesPage — Comptes du foyer, affichage nom/email (backlog SSO)', () => {
  it('affiche le nom d’utilisateur (login) EN PLUS du nom et de l’email, jamais à sa place', async () => {
    // Revue du 04/09/2026 (retour utilisateur) : le nom d'utilisateur (login) est
    // celui utilisé par le journal d'accès en dessous — le masquer derrière le nom
    // d'affichage SSO rendait impossible de recouper les deux écrans.
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 2, username: 'paul.oidc', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [], nom: 'Paul Cartieri', email: 'paul@example.com' },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('paul.oidc')
    expect(screen.getByText('Paul Cartieri')).toBeInTheDocument()
    expect(screen.getByText('· paul@example.com', { exact: false })).toBeInTheDocument()
  })

  it('sans nom, affiche le username (comportement inchangé pour un compte mot de passe)', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 3, username: 'conjoint', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [] },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('conjoint')
  })
})

describe('ReglagesPage — écran d’administration des comptes du foyer (revue du 04/09/2026)', () => {
  it('signale une connexion locale quand oidc_display_name est absent', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 3, username: 'conjoint', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [], oidc_display_name: null },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('Connexion locale')
  })

  it('signale le fournisseur SSO quand oidc_display_name est renseigné', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 4, username: 'bob', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [], oidc_display_name: 'Authentik' },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('Connexion SSO (Authentik)')
  })

  it('affiche "Jamais connecté" en l’absence de dernière connexion, sinon la date', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 5, username: 'jamais', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [], derniere_connexion: null },
      { id: 6, username: 'deja', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [], derniere_connexion: '2026-09-01T10:30:00' },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('Jamais connecté')
    expect(screen.getByText(/Dernière connexion/)).toBeInTheDocument()
  })

  it('affiche un badge de verrouillage quand verrouille_jusqua est dans le futur', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      {
        id: 7,
        username: 'attaque',
        role: 'membre',
        created_at: '2026-01-01T00:00:00',
        detenteur_ids: [],
        verrouille_jusqua: new Date(Date.now() + 60_000).toISOString(),
      },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    expect(await screen.findByText(/Verrouillé jusqu'à/)).toBeInTheDocument()
  })

  it('n’affiche pas de badge de verrouillage quand verrouille_jusqua est dans le passé', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      {
        id: 8,
        username: 'ancien-verrou',
        role: 'membre',
        created_at: '2026-01-01T00:00:00',
        detenteur_ids: [],
        verrouille_jusqua: '2020-01-01T00:00:00',
      },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('ancien-verrou')
    expect(screen.queryByText(/Verrouillé jusqu'à/)).not.toBeInTheDocument()
  })

  it('changer le rôle dans le sélecteur appelle updateHouseholdMember puis recharge la liste', async () => {
    vi.mocked(api.listHouseholdMembers)
      .mockResolvedValueOnce([{ id: 9, username: 'conjoint', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [] }])
      .mockResolvedValue([{ id: 9, username: 'conjoint', role: 'invite', created_at: '2026-01-01T00:00:00', detenteur_ids: [] }])
    vi.mocked(api.updateHouseholdMember).mockResolvedValue({
      id: 9,
      username: 'conjoint',
      role: 'invite',
      created_at: '2026-01-01T00:00:00',
      detenteur_ids: [],
    })
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')
    await screen.findByText('conjoint')

    fireEvent.change(screen.getByLabelText('Rôle de conjoint'), { target: { value: 'invite' } })

    await vi.waitFor(() => expect(api.updateHouseholdMember).toHaveBeenCalledWith(9, { role: 'invite' }))
    expect(await screen.findByLabelText('Rôle de conjoint')).toHaveValue('invite')
  })

  it('renommer un membre : Modifier ouvre l’édition, Enregistrer appelle updateHouseholdMember puis recharge', async () => {
    vi.mocked(api.listHouseholdMembers)
      .mockResolvedValueOnce([{ id: 11, username: 'ancien-nom', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [] }])
      .mockResolvedValue([{ id: 11, username: 'nouveau-nom', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [] }])
    vi.mocked(api.updateHouseholdMember).mockResolvedValue({
      id: 11,
      username: 'nouveau-nom',
      role: 'membre',
      created_at: '2026-01-01T00:00:00',
      detenteur_ids: [],
    })
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')
    await screen.findByText('ancien-nom')

    fireEvent.click(screen.getByRole('button', { name: "Modifier le nom d'utilisateur de ancien-nom" }))
    const champ = screen.getByLabelText("Nom d'utilisateur de ancien-nom (édition)")
    fireEvent.change(champ, { target: { value: 'nouveau-nom' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await vi.waitFor(() => expect(api.updateHouseholdMember).toHaveBeenCalledWith(11, { username: 'nouveau-nom' }))
    await screen.findByText('nouveau-nom')
  })

  it('renommer un membre : Annuler referme l’édition sans appeler l’API', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 12, username: 'inchange', role: 'membre', created_at: '2026-01-01T00:00:00', detenteur_ids: [] },
    ])
    // Réinitialisé : les tests précédents de ce fichier ont déjà appelé ce mock, or
    // seule l'absence d'appel DEPUIS cette action précise nous intéresse ici.
    vi.mocked(api.updateHouseholdMember).mockClear()
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')
    await screen.findByText('inchange')

    fireEvent.click(screen.getByRole('button', { name: "Modifier le nom d'utilisateur de inchange" }))
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(api.updateHouseholdMember).not.toHaveBeenCalled()
    expect(screen.getByText('inchange')).toBeInTheDocument()
  })

  it('le propriétaire n’a ni bouton Modifier (nom) ni sélecteur de rôle sur sa propre ligne', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 1, username: 'testeur', role: 'proprietaire', created_at: '2026-01-01T00:00:00', detenteur_ids: [] },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('testeur')
    expect(screen.queryByRole('button', { name: "Modifier le nom d'utilisateur de testeur" })).not.toBeInTheDocument()
  })

  it('le propriétaire connecté apparaît dans sa propre liste, en lecture seule', async () => {
    // Régression signalée par un utilisateur réel : avec un seul compte connecté
    // (aucun membre/invité créé), la liste paraissait vide alors que le propriétaire
    // doit s'y voir lui-même — le backend le renvoie désormais toujours en premier
    // (`list_household_members`, `routers/auth.py`).
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 1, username: 'testeur', role: 'proprietaire', created_at: '2026-01-01T00:00:00', detenteur_ids: [] },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('testeur')
    expect(screen.getByText('(vous)')).toBeInTheDocument()
    expect(screen.getByText('Propriétaire')).toBeInTheDocument()
    // Ni rôle éditable ni suppression pour sa propre ligne (le backend les refuse
    // aussi, 404 — cf. `test_modifier_le_role_dun_membre_dun_autre_foyer_renvoie_404`
    // côté backend, même check IDOR appliqué à `current_user.id`).
    expect(screen.queryByLabelText('Rôle de testeur')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retirer testeur du foyer' })).not.toBeInTheDocument()
  })

  it('le propriétaire et un membre coexistent, seul le membre reste éditable/supprimable', async () => {
    vi.mocked(api.listHouseholdMembers).mockResolvedValue([
      { id: 1, username: 'testeur', role: 'proprietaire', created_at: '2026-01-01T00:00:00', detenteur_ids: [] },
      { id: 10, username: 'conjoint', role: 'membre', created_at: '2026-01-02T00:00:00', detenteur_ids: [] },
    ])
    renderReglages()
    ouvrirOnglet('Comptes & sécurité')

    await screen.findByText('conjoint')
    expect(screen.queryByLabelText('Rôle de testeur')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Rôle de conjoint')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirer conjoint du foyer' })).toBeInTheDocument()
  })
})

function lienPartage(overrides: Partial<import('../api/types').LienPartage> = {}): import('../api/types').LienPartage {
  return {
    id: 1,
    nom: 'Pour la banque',
    detenteur_id: null,
    inclure_patrimoine_net: true,
    inclure_repartition: true,
    inclure_performance: true,
    inclure_budget: false,
    masquer_valeurs: false,
    code_requis: false,
    created_at: '2026-01-01T00:00:00',
    expires_at: '2099-01-01T00:00:00',
    revoked_at: null,
    ...overrides,
  }
}

/** Ce que rend la création : le seul moment où le jeton existe côté client (§ BK.2e). */
function lienPartageCree(overrides: Partial<import('../api/types').LienPartageCree> = {}): import('../api/types').LienPartageCree {
  return { ...lienPartage(), token: 'a'.repeat(64), ...overrides }
}

describe('ReglagesPage — Liens de partage (backlog 2.Q.1)', () => {
  it("affiche un message quand aucun lien n'est créé", async () => {
    vi.mocked(api.listLiensPartage).mockResolvedValue([])
    renderReglages()
    ouvrirOnglet('Partage')

    await screen.findByText('Aucun lien de partage créé.')
  })

  it("liste les liens existants sans jamais afficher leur adresse (le serveur n'en garde que l'empreinte)", async () => {
    vi.mocked(api.listLiensPartage).mockResolvedValue([lienPartage()])
    renderReglages()
    ouvrirOnglet('Partage')

    await screen.findByText('Pour la banque')
    expect(screen.queryByLabelText('Lien de partage')).not.toBeInTheDocument()
    expect(screen.getByText(/n'est montrée qu'à sa création/)).toBeInTheDocument()
  })

  it('un lien révoqué affiche le badge « révoqué » sans URL ni bouton Révoquer', async () => {
    vi.mocked(api.listLiensPartage).mockResolvedValue([lienPartage({ revoked_at: '2026-01-02T00:00:00' })])
    renderReglages()
    ouvrirOnglet('Partage')

    await screen.findByText('révoqué')
    expect(screen.queryByRole('button', { name: 'Révoquer' })).not.toBeInTheDocument()
  })

  it('un lien avec code requis affiche le badge correspondant', async () => {
    vi.mocked(api.listLiensPartage).mockResolvedValue([lienPartage({ code_requis: true })])
    renderReglages()
    ouvrirOnglet('Partage')

    await screen.findByText('code requis')
  })

  it('créer un lien appelle createLienPartage avec les sections cochées, recharge la liste et montre le lien une seule fois', async () => {
    vi.mocked(api.listLiensPartage).mockResolvedValueOnce([]).mockResolvedValue([lienPartage()])
    vi.mocked(api.createLienPartage).mockResolvedValue(lienPartageCree())
    renderReglages()
    ouvrirOnglet('Partage')
    await screen.findByText('Aucun lien de partage créé.')

    fireEvent.change(screen.getByPlaceholderText('Pour la banque'), { target: { value: 'Pour la banque' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Budget' }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer le lien' }))

    await vi.waitFor(() =>
      expect(api.createLienPartage).toHaveBeenCalledWith(
        expect.objectContaining({ nom: 'Pour la banque', inclure_budget: true, detenteur_id: null, code: null }),
      ),
    )
    const champ = await screen.findByLabelText('Lien de partage')
    expect(champ).toHaveValue(`http://localhost:3000/partage/${'a'.repeat(64)}`)
    expect(screen.getByText(/il ne sera plus affiché/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Masquer' }))
    expect(screen.queryByLabelText('Lien de partage')).not.toBeInTheDocument()
  })

  it('révoquer un lien appelle revokeLienPartage puis recharge la liste', async () => {
    vi.mocked(api.listLiensPartage).mockResolvedValueOnce([lienPartage()]).mockResolvedValue([lienPartage({ revoked_at: '2026-01-02T00:00:00' })])
    vi.mocked(api.revokeLienPartage).mockResolvedValue(undefined)
    renderReglages()
    ouvrirOnglet('Partage')
    await screen.findByText('Pour la banque')

    fireEvent.click(screen.getByRole('button', { name: 'Révoquer' }))

    await vi.waitFor(() => expect(api.revokeLienPartage).toHaveBeenCalledWith(1))
    await screen.findByText('révoqué')
  })
})

function holdingDeclaration(overrides: Partial<import('../api/types').Holding> = {}): import('../api/types').Holding {
  return {
    id: 1,
    ticker: 'AAA',
    nom: 'Action A',
    quantite: 10,
    prix_revient_moyen: 100,
    cout_acquisition_total: 100,
    compte: null,
    type_actif: 'STOCK',
    origine: 'manuel',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    market_data: null,
    rendement_depuis_achat_pct: null,
    rendement_annualise_pct: null,
    valeur: 1000,
    valeur_estimee: null,
    date_valeur_estimee: null,
    taux_pct: null,
    zone_geo: null,
    secteur: null,
    versement_mensuel: null,
    date_acquisition: null,
    ...overrides,
  }
}

function loanDeclaration(overrides: Partial<import('../api/types').Loan> = {}): import('../api/types').Loan {
  return {
    id: 1,
    libelle: 'Crédit immo',
    capital_initial: 200000,
    taux_annuel_pct: 1.5,
    mensualite: 1000,
    date_debut: '2020-01-01T00:00:00',
    duree_mois: 200,
    capital_restant_du_manuel: null,
    derniere_maj_manuelle: null,
    holding_id: null,
    etablissement_id: null,
    capital_restant_du: 150000,
    created_at: '2020-01-01T00:00:00',
    updated_at: '2020-01-01T00:00:00',
    ...overrides,
  }
}

describe('ReglagesPage — Déclaration de patrimoine (backlog 2.Q.2)', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:fake'), revokeObjectURL: vi.fn() })
  })

  it('ouvre la modale et liste les actifs et emprunts, tous cochés par défaut', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holdingDeclaration()])
    vi.mocked(api.listLoans).mockResolvedValue([loanDeclaration()])
    renderReglages()

    fireEvent.click(await screen.findByRole('button', { name: 'Déclaration de patrimoine (PDF)' }))

    await screen.findByRole('dialog')
    expect(screen.getByText('Action A')).toBeInTheDocument()
    expect(screen.getByText('Crédit immo')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Action A/ })).toBeChecked()
  })

  it('générer le PDF appelle downloadDeclarationPatrimoine avec la sélection par défaut', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holdingDeclaration()])
    vi.mocked(api.listLoans).mockResolvedValue([loanDeclaration()])
    vi.mocked(api.downloadDeclarationPatrimoine).mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }))
    renderReglages()

    fireEvent.click(await screen.findByRole('button', { name: 'Déclaration de patrimoine (PDF)' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Générer le PDF' }))

    await vi.waitFor(() =>
      expect(api.downloadDeclarationPatrimoine).toHaveBeenCalledWith(
        expect.objectContaining({ holding_ids: [1], loan_ids: [1], detenteur_id: null, inclure_profil: false }),
      ),
    )
  })

  it('décocher un actif le retire de la sélection envoyée', async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([holdingDeclaration()])
    vi.mocked(api.listLoans).mockResolvedValue([])
    vi.mocked(api.downloadDeclarationPatrimoine).mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }))
    renderReglages()

    fireEvent.click(await screen.findByRole('button', { name: 'Déclaration de patrimoine (PDF)' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('checkbox', { name: /Action A/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Générer le PDF' }))

    await vi.waitFor(() => expect(api.downloadDeclarationPatrimoine).toHaveBeenCalledWith(expect.objectContaining({ holding_ids: [] })))
  })

  it("affiche un message d'erreur si la génération échoue, sans fermer la modale", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([])
    vi.mocked(api.listLoans).mockResolvedValue([])
    vi.mocked(api.downloadDeclarationPatrimoine).mockRejectedValue(new Error('Membre du foyer introuvable'))
    renderReglages()

    fireEvent.click(await screen.findByRole('button', { name: 'Déclaration de patrimoine (PDF)' }))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Générer le PDF' }))

    await screen.findByText('Membre du foyer introuvable')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('ReglagesPage — Assistant de bienvenue (welcome board)', () => {
  it('un propriétaire voit le bouton "Revoir l\'assistant de bienvenue", qui ouvre l\'assistant', async () => {
    renderReglages()

    const bouton = await screen.findByRole('button', { name: "Revoir l'assistant de bienvenue" })
    fireEvent.click(bouton)

    expect(await screen.findByRole('heading', { name: 'Configuration initiale' })).toBeInTheDocument()
  })

  it('un membre du foyer ne voit pas le bouton (réservé au propriétaire)', async () => {
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ ...utilisateurFactice, user: { ...utilisateurFactice.user!, role: 'membre' } }}>
          <ReglagesPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    ouvrirOnglet('Général')

    await screen.findByText('Méthode de calcul du coût de revient')
    expect(screen.queryByRole('button', { name: "Revoir l'assistant de bienvenue" })).not.toBeInTheDocument()
  })

  it('"Terminer" referme l\'assistant sans rouvrir le drapeau déjà acquis (pure relecture)', async () => {
    const completeOnboarding = vi.fn()
    render(
      <MemoryRouter>
        <AuthContext.Provider value={{ ...utilisateurFactice, completeOnboarding }}>
          <ReglagesPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: "Revoir l'assistant de bienvenue" }))
    await screen.findByRole('heading', { name: 'Configuration initiale' })
    // Navigue jusqu'à la dernière étape avant de terminer — nombre d'étapes lu
    // dynamiquement (`etapesPourUtilisateur`), pour ne jamais se désynchroniser d'un
    // ajout/retrait d'étape (même patron que `WelcomeWizard.test.tsx`).
    for (let i = 0; i < etapesPourUtilisateur(utilisateurFactice.user).length - 1; i++) fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }))

    await vi.waitFor(() => expect(screen.queryByRole('heading', { name: 'Configuration initiale' })).not.toBeInTheDocument())
    expect(completeOnboarding).not.toHaveBeenCalled()
  })
})

describe('ReglagesPage — bascule « Langage simple » (backlog § AG.1)', () => {
  it('affiche son état courant et déclenche la bascule au clic', async () => {
    renderReglages()
    ouvrirOnglet('Général')

    const bouton = await screen.findByRole('button', { name: 'Langage simple' })
    expect(bouton).toHaveTextContent('Désactivé')
    expect(bouton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(bouton)
    expect(toggleLangageSimpleMock).toHaveBeenCalledTimes(1)
  })
})

describe('ReglagesPage — galerie de badges (backlog § AG.4)', () => {
  it('affiche chaque jalon avec son état (obtenu ou non) et sa date', async () => {
    vi.mocked(api.listJalons).mockResolvedValue([
      { id: 'premier_import', titre: 'Premier import', description: 'Un premier import réussi.', atteint: true, date_atteint: '2026-06-01', nouveau: false },
      { id: 'un_an_suivi', titre: 'Une année de suivi complète', description: 'Un an.', atteint: false, date_atteint: null, nouveau: false },
    ])
    renderReglages()
    ouvrirOnglet('Badges')

    await screen.findByText('Premier import')
    expect(screen.getByText(/Obtenu le/)).toBeInTheDocument()
    expect(screen.getByText('Une année de suivi complète')).toBeInTheDocument()
    expect(screen.getByText('Pas encore obtenu')).toBeInTheDocument()
  })

  it("propose de réessayer si le chargement échoue", async () => {
    vi.mocked(api.listJalons).mockRejectedValueOnce(new Error('panne simulée'))
    renderReglages()
    ouvrirOnglet('Badges')

    await screen.findByText('panne simulée')

    vi.mocked(api.listJalons).mockResolvedValueOnce([])
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    await vi.waitFor(() => expect(screen.queryByText('panne simulée')).not.toBeInTheDocument())
  })
})

// Backlog § BK.2d : l'écran du propriétaire selon l'état de l'installation.
describe('ReglagesPage — opérateur, naissance des foyers et liaison SSO (backlog § BK.2d)', () => {
  function rendreAvec(utilisateur: Partial<NonNullable<AuthContextValue['user']>>) {
    const valeur: AuthContextValue = { ...utilisateurFactice, user: { ...utilisateurFactice.user!, ...utilisateur } }
    render(
      <MemoryRouter>
        <AuthContext.Provider value={valeur}>
          <ReglagesPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
  }

  it("tant qu'aucun opérateur n'existe : onglet Automatisations et logo SSO sont au propriétaire", async () => {
    rendreAvec({ operateur_existe: false })

    expect(screen.getByRole('tab', { name: 'Automatisations' })).toBeInTheDocument()
    ouvrirOnglet('Comptes & sécurité')
    expect(await screen.findByRole('heading', { name: 'Logo du bouton de connexion SSO' })).toBeInTheDocument()
  })

  it("dès qu'un opérateur existe : plus d'onglet Automatisations, plus de logo SSO, et aucun appel qui répondrait 403", async () => {
    vi.mocked(api.listJobs).mockClear()
    vi.mocked(api.getLogoConnexionSso).mockClear()
    rendreAvec({ operateur_existe: true })

    expect(screen.queryByRole('tab', { name: 'Automatisations' })).not.toBeInTheDocument()
    ouvrirOnglet('Comptes & sécurité')
    expect(await screen.findByRole('heading', { name: 'Accès et invitations' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Logo du bouton de connexion SSO' })).not.toBeInTheDocument()
    expect(api.listJobs).not.toHaveBeenCalled()
    expect(api.getLogoConnexionSso).not.toHaveBeenCalled()
  })

  it("une adresse ?onglet=automatisations retombe sur l'onglet par défaut une fois l'opérateur créé", () => {
    render(
      <MemoryRouter initialEntries={['/reglages?onglet=automatisations']}>
        <AuthContext.Provider value={{ ...utilisateurFactice, user: { ...utilisateurFactice.user!, operateur_existe: true } }}>
          <ReglagesPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: 'Général', selected: true })).toBeInTheDocument()
  })

  it("propose le bandeau « Créer le compte opérateur » tant que peut_amorcer_operateur est vrai", () => {
    rendreAvec({ peut_amorcer_operateur: true })

    expect(screen.getByRole('heading', { name: 'Créer le compte opérateur' })).toBeInTheDocument()
  })

  it("pas de bandeau quand l'opérateur ne peut plus être amorcé", () => {
    rendreAvec({ peut_amorcer_operateur: false, operateur_existe: true })

    expect(screen.queryByRole('heading', { name: 'Créer le compte opérateur' })).not.toBeInTheDocument()
  })

  it('en mode invitation, la section « Inviter un proche à créer son foyer » apparaît ; sinon elle est masquée', async () => {
    rendreAvec({ peut_inviter_a_creer_foyer: true })
    ouvrirOnglet('Comptes & sécurité')

    expect(await screen.findByRole('heading', { name: 'Inviter un proche à créer son foyer' })).toBeInTheDocument()
    await vi.waitFor(() => expect(api.listInvitationsFoyer).toHaveBeenCalled())
  })

  it('en mode fermé, aucune section de création de foyer et aucun appel vers /invitations/foyer', async () => {
    vi.mocked(api.listInvitationsFoyer).mockClear()
    rendreAvec({ peut_inviter_a_creer_foyer: false })
    ouvrirOnglet('Comptes & sécurité')

    expect(await screen.findByRole('heading', { name: 'Accès et invitations' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Inviter un proche à créer son foyer' })).not.toBeInTheDocument()
    expect(api.listInvitationsFoyer).not.toHaveBeenCalled()
  })

  it('la carte « Connexion SSO » apparaît quand le SSO est configuré', async () => {
    vi.mocked(api.getOidcStatus).mockResolvedValueOnce({ enabled: true, display_name: 'Authentik', logo: null })
    rendreAvec({ sso_lie: false })
    ouvrirOnglet('Comptes & sécurité')

    expect(await screen.findByRole('button', { name: 'Lier mon compte SSO' })).toBeInTheDocument()
  })
})
