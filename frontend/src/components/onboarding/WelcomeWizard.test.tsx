import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { AuthContext, type AuthContextValue } from '../../contexts/authContextObject'
import WelcomeWizard from './WelcomeWizard'
import { etapesPourUtilisateur } from './steps'

// Étapes 2, 3 et 4 (`PreferencesCard`/`DetenteursCard`/"Démarrer le portefeuille")
// chargent leurs propres données au montage — stubs neutres par défaut (portefeuille
// vide), ce fichier ne verrouille que le déroulé de l'assistant lui-même.
vi.mock('../../api/client', () => ({
  api: {
    getPreferences: vi.fn().mockResolvedValue({ methode_cout: 'cout_moyen_pondere', taux_imposition_pct: null }),
    updatePreferences: vi.fn(),
    listDetenteurs: vi.fn().mockResolvedValue([]),
    createDetenteur: vi.fn(),
    deleteDetenteur: vi.fn(),
    listHoldings: vi.fn().mockResolvedValue([]),
    createHolding: vi.fn(),
    // Import du grand livre en deux temps depuis le 03/09/2026 (compte/
    // établissement obligatoires) — remplace l'ancien `importTransactions` unique.
    importTransactionsApercu: vi.fn(),
    importTransactionsConfirm: vi.fn(),
    // Comptes structurels (écran Comptes, backlog X.1) : `AjoutHoldingForm`,
    // embarqué tel quel (non mocké) dans l'étape "Démarrer le portefeuille", charge
    // désormais la liste des comptes existants — hors de l'objet de ce fichier,
    // stub neutre par défaut (aucun compte existant).
    listComptes: vi.fn().mockResolvedValue([]),
    // Étape "Comptes" (backlog X.3) : `EtablissementsCard` et `AjoutCompteForm`,
    // embarqués tels quels (non mockés), stubs neutres par défaut.
    listEtablissements: vi.fn().mockResolvedValue([]),
    createEtablissement: vi.fn(),
    updateEtablissement: vi.fn(),
    deleteEtablissement: vi.fn(),
    createCompte: vi.fn(),
    deleteCompte: vi.fn(),
    updateLangueFoyer: vi.fn().mockResolvedValue(undefined),
    // Étape « Inviter les membres du foyer » (backlog § BK.2b) : `SectionInvitations`,
    // embarquée telle quelle, liste les invitations existantes (aucune par défaut).
    listInvitations: vi.fn().mockResolvedValue([]),
    createInvitation: vi.fn(),
    revoquerInvitation: vi.fn(),
    // Étape « Administration de l'installation » (backlog § BK.2d) : `CreationOperateur`.
    amorcerOperateur: vi.fn(),
  },
}))

function utilisateurFactice(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: 1, username: 'testeur', role: 'proprietaire', onboarding_termine: false, holdings_sans_compte: 0 },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: vi.fn(),
    refetchUser: vi.fn(),
    ...overrides,
  }
}

// `listHoldings` (comme les autres mocks à valeur unique) n'est jamais réinitialisé
// automatiquement entre les tests (pas de `clearMocks`/`resetMocks` dans la config
// Vitest de ce projet) — sans ce reset, un `mockResolvedValue(...)` posé par un test
// "portefeuille déjà peuplé" fuirait silencieusement vers les tests suivants.
beforeEach(() => {
  vi.mocked(api.listHoldings).mockResolvedValue([])
})

function renderWizard(auth: AuthContextValue, onClose?: () => void) {
  return render(
    // `MemoryRouter` : l'étape "Démarrer le portefeuille" embarque
    // `ImportTransactionsSection`, qui utilise `useNavigate()` (bouton "Voir le
    // tableau de bord" après un import réussi) — sans routeur, son montage lève.
    <MemoryRouter>
      <AuthContext.Provider value={auth}>
        <WelcomeWizard onClose={onClose} />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('WelcomeWizard', () => {
  it('affiche la première étape ("Bienvenue") au montage', () => {
    renderWizard(utilisateurFactice())

    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument()
    expect(screen.getByText(`Étape 1 sur ${etapesPourUtilisateur(utilisateurFactice().user).length}`)).toBeInTheDocument()
  })

  it('"Suivant" avance les étapes, "Précédent" recule, dans l\'ordre déclaré', () => {
    renderWizard(utilisateurFactice())

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByRole('heading', { name: 'Préférences' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByRole('heading', { name: 'Détenteurs du foyer' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }))
    expect(screen.getByRole('heading', { name: 'Préférences' })).toBeInTheDocument()
  })

  it('le bouton "Précédent" est désactivé sur la première étape', () => {
    renderWizard(utilisateurFactice())

    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled()
  })

  it('"Passer l\'assistant" termine l\'onboarding et ferme immédiatement, sans attendre la dernière étape', async () => {
    const completeOnboarding = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    renderWizard(utilisateurFactice({ completeOnboarding }), onClose)

    fireEvent.click(screen.getByRole('button', { name: "Passer l'assistant" }))

    await vi.waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('la dernière étape affiche "Terminer" (pas "Suivant"), qui appelle aussi la complétion', async () => {
    const completeOnboarding = vi.fn().mockResolvedValue(undefined)
    renderWizard(utilisateurFactice({ completeOnboarding }))

    for (let i = 0; i < etapesPourUtilisateur(utilisateurFactice().user).length - 1; i++) fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(screen.getByRole('heading', { name: 'Terminé' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }))
    await vi.waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1))
  })

  it('en mode relecture (onboarding déjà terminé), "Terminer" ferme sans rappeler l\'API', async () => {
    const completeOnboarding = vi.fn()
    const onClose = vi.fn()
    renderWizard(utilisateurFactice({ user: { id: 1, username: 'testeur', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0 }, completeOnboarding }), onClose)

    fireEvent.click(screen.getByRole('button', { name: "Passer l'assistant" }))

    expect(completeOnboarding).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("l'étape Préférences réutilise réellement PreferencesCard (méthode de coût affichée)", async () => {
    renderWizard(utilisateurFactice())
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText('Coût moyen pondéré')).toBeInTheDocument()
    expect(api.getPreferences).toHaveBeenCalled()
  })

  it("l'étape Détenteurs réutilise réellement DetenteursCard (état vide affiché)", async () => {
    renderWizard(utilisateurFactice())
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText('Aucun détenteur déclaré.')).toBeInTheDocument()
  })

  it("l'étape Détenteurs affiche les détenteurs déjà déclarés (état réel, pas un formulaire vide)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([
      { id: 1, nom: 'Alice', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' },
    ])
    renderWizard(utilisateurFactice())
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText('Alice')).toBeInTheDocument()
  })

  it("l'étape Comptes réutilise réellement EtablissementsCard et AjoutCompteForm (état vide affiché)", async () => {
    renderWizard(utilisateurFactice())
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText('Aucun établissement déclaré.')).toBeInTheDocument()
    expect(screen.getByText('Aucun compte déclaré.')).toBeInTheDocument()
    expect(api.listEtablissements).toHaveBeenCalled()
    expect(api.listComptes).toHaveBeenCalled()
  })

  it("l'étape « Inviter les membres du foyer » embarque le formulaire d'invitation et les invitations déjà créées", async () => {
    vi.mocked(api.listInvitations).mockResolvedValue([
      {
        id: 4,
        role: 'membre',
        libelle: 'Sophie',
        statut: 'en_attente',
        cree_le: '2026-09-30T10:00:00',
        expire_le: '2026-10-07T10:00:00',
        utilisee_le: null,
        utilisee_par: null,
        revoquee_le: null,
        detenteur_ids: [],
      },
    ])
    renderWizard(utilisateurFactice())
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(screen.getByRole('heading', { name: 'Inviter les membres du foyer' })).toBeInTheDocument()
    expect(await screen.findByText('Sophie')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Créer l'invitation" })).toBeInTheDocument()
  })

  it("l'étape \"Démarrer le portefeuille\" reconnaît les positions déjà existantes plutôt que de proposer de repartir à vide", async () => {
    vi.mocked(api.listHoldings).mockResolvedValue([
      { ticker: 'AAPL', quantite: 10 } as never,
      { ticker: 'MSFT', quantite: 5 } as never,
    ])
    renderWizard(utilisateurFactice())
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText(/compte déjà/)).toBeInTheDocument()
    expect(screen.getByText('2 positions', { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(/commencer à vide/)).not.toBeInTheDocument()
  })

  it("l'étape \"Démarrer le portefeuille\" embarque réellement l'ajout manuel ET l'import, pas de simples liens de renvoi", async () => {
    renderWizard(utilisateurFactice())
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    await screen.findByRole('heading', { name: 'Ajouter une ligne manuellement' })
    expect(screen.getByRole('heading', { name: 'Historique de transactions (format détecté automatiquement)' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ticker')).toBeInTheDocument()
  })

  it('ajouter une position depuis le formulaire embarqué met à jour le compteur affiché, en direct', async () => {
    vi.mocked(api.createHolding).mockResolvedValue({ ticker: 'AAPL', quantite: 10 } as never)
    renderWizard(utilisateurFactice())
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(await screen.findByText(/Ajoute une première position/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Ticker'), { target: { value: 'aapl' } })
    fireEvent.change(screen.getByLabelText('Quantité'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    expect(await screen.findByText(/compte déjà/)).toBeInTheDocument()
    expect(api.createHolding).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'AAPL', quantite: 10 }))
  })

  it('un import de transactions réussi recharge le compteur affiché (pas juste son propre bandeau)', async () => {
    // Import en deux temps depuis le 03/09/2026 (compte/établissement obligatoires) :
    // l'aperçu propose l'établissement, la confirmation importe pour de bon.
    vi.mocked(api.listHoldings).mockResolvedValueOnce([]).mockResolvedValueOnce([{ ticker: 'AAPL' } as never, { ticker: 'MSFT' } as never])
    vi.mocked(api.importTransactionsApercu).mockResolvedValue({
      file_token: 'tok-1',
      lignes_lues: 10,
      mouvements_hors_bourse_exclus: 2,
      comptages: { compte_titres: 8 },
      noms_par_defaut: { compte_titres: 'Compte-titres' },
      etablissements: [],
    })
    vi.mocked(api.importTransactionsConfirm).mockResolvedValue({
      lignes_lues: 10,
      importees: 8,
      mises_a_jour: 0,
      doublons_ignores: 0,
      mouvements_hors_bourse_exclus: 2,
      positions_recalculees: 2,
      anomalies_detectees: 0,
      lignes_manuelles_remplacees: 0,
      comptes_crees: 1,
    })
    renderWizard(utilisateurFactice())
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    await screen.findByText(/Ajoute une première position/)

    const fichier = new File(['contenu'], 'transactions.csv', { type: 'text/csv' })
    const input = document.querySelector('input[type="file"][accept=".csv"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [fichier] } })

    fireEvent.change(await screen.findByLabelText('Établissement'), { target: { value: '__nouveau__' } })
    fireEvent.change(screen.getByLabelText('Nom du nouvel établissement (Établissement)'), { target: { value: 'Trade Republic' } })
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'import" }))

    await screen.findByText(/positions? recalculées?/)
    expect(await screen.findByText(/compte déjà/)).toBeInTheDocument()
  })

  it('la "Bienvenue" et le message final s\'adaptent au rejeu (onboarding déjà terminé)', () => {
    renderWizard(utilisateurFactice({ user: { id: 1, username: 'testeur', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0 } }))

    expect(screen.getByText(/Retour sur le parcours/)).toBeInTheDocument()
    expect(screen.queryByText(/ça prend deux minutes/)).not.toBeInTheDocument()
  })
})

// Backlog § BL (demande du 23/09/2026) : « prévoir dans l'assistant, à la première
// page, de choisir sa langue ».
describe('WelcomeWizard — choix de la langue en première page', () => {
  it('la toute première page propose les langues, chacune écrite dans sa langue', () => {
    renderWizard(utilisateurFactice())

    expect(screen.getByRole('heading', { name: 'Bienvenue' })).toBeInTheDocument()
    const choix = screen.getByRole('combobox', { name: "Langue de l'interface" })
    expect(within(choix).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Français',
      'English',
      'Español',
      'Deutsch',
      'Italiano',
    ])
  })

  it("choisir une langue l'enregistre pour le foyer, puis recharge l'utilisateur", async () => {
    const refetchUser = vi.fn().mockResolvedValue(undefined)
    renderWizard(utilisateurFactice({ refetchUser }))

    fireEvent.change(screen.getByRole('combobox', { name: "Langue de l'interface" }), { target: { value: 'es' } })

    // Délai large : la langue choisie est chargée à la demande (`import()`), dictionnaire
    // volumineux depuis § BL.2 — la seconde par défaut ne suffit pas toujours en suite complète.
    await vi.waitFor(() => expect(api.updateLangueFoyer).toHaveBeenCalledWith('es'), { timeout: 5000 })
    await vi.waitFor(() => expect(refetchUser).toHaveBeenCalled())
  })
})

// Backlog § BK.2d : « Administration de l'installation », pour le propriétaire qui peut
// amorcer l'opérateur — en pratique le premier compte d'une installation neuve.
describe("WelcomeWizard — étape « Administration de l'installation »", () => {
  const premierCompte = () => ({
    user: {
      id: 1,
      username: 'testeur',
      role: 'proprietaire' as const,
      onboarding_termine: false,
      holdings_sans_compte: 0,
      peut_amorcer_operateur: true,
    },
  })

  function allerALEtape(nom: string) {
    for (let i = 0; i < 10 && !screen.queryByRole('heading', { name: nom }); i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    }
  }

  it("n'est proposée que si peut_amorcer_operateur est vrai, après « Inviter » et avant « Démarrer le portefeuille »", () => {
    const avec = etapesPourUtilisateur(utilisateurFactice(premierCompte()).user).map((e) => e.key)
    const sans = etapesPourUtilisateur(utilisateurFactice().user).map((e) => e.key)

    expect(avec).toEqual(['bienvenue', 'preferences', 'detenteurs', 'comptes', 'inviter', 'operateur', 'demarrage', 'termine'])
    expect(sans).not.toContain('operateur')
  })

  it('montre le formulaire du bandeau, et se passe sans rien saisir (plus tard)', () => {
    renderWizard(utilisateurFactice(premierCompte()))
    expect(screen.getByText(`Étape 1 sur ${etapesPourUtilisateur(utilisateurFactice(premierCompte()).user).length}`)).toBeInTheDocument()

    allerALEtape("Administration de l'installation")

    expect(screen.getByText(/Cette installation peut accueillir plusieurs foyers/)).toBeInTheDocument()
    expect(screen.getByText(/Cette étape est facultative/)).toBeInTheDocument()
    expect(screen.getByLabelText("Nom d'utilisateur")).toBeInTheDocument()
    // Plus tard : on passe à l'étape suivante sans rien créer.
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))
    expect(screen.getByRole('heading', { name: 'Démarrer le portefeuille' })).toBeInTheDocument()
    expect(api.amorcerOperateur).not.toHaveBeenCalled()
  })

  it("crée l'opérateur sans que l'étape disparaisse sous les pieds de l'utilisateur", async () => {
    vi.mocked(api.amorcerOperateur).mockResolvedValue({ id: 2, username: 'admin', created_at: '2026-10-01T10:00:00' })
    const auth = utilisateurFactice(premierCompte())
    const { rerender } = renderWizard(auth)
    allerALEtape("Administration de l'installation")

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'mot-de-passe-1' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'mot-de-passe-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte opérateur' }))
    expect(await screen.findByText('Compte opérateur « admin » créé.')).toBeInTheDocument()
    expect(api.amorcerOperateur).toHaveBeenCalledWith('admin', 'mot-de-passe-1')

    // L'utilisateur rechargé n'a plus peut_amorcer_operateur : l'étape reste affichée.
    rerender(
      <MemoryRouter>
        <AuthContext.Provider value={{ ...auth, user: { ...auth.user!, peut_amorcer_operateur: false, operateur_existe: true } }}>
          <WelcomeWizard />
        </AuthContext.Provider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: "Administration de l'installation" })).toBeInTheDocument()
    expect(screen.getByText('Compte opérateur « admin » créé.')).toBeInTheDocument()
  })
})
