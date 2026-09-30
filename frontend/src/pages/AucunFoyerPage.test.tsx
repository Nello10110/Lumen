import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import AucunFoyerPage from './AucunFoyerPage'

vi.mock('../api/client', () => ({
  api: {
    accepterInvitation: vi.fn(),
    creerFoyer: vi.fn(),
    supprimerMonCompte: vi.fn(),
    apercuSuppressionCompte: vi.fn(),
    changerFoyerCourant: vi.fn(),
  },
}))
vi.mock('../auth/changementFoyer', () => ({ rechargerApplication: vi.fn() }))

const REJOINT: AuthUser = { id: 1, username: 'sophie', role: 'membre', onboarding_termine: true, holdings_sans_compte: 0 }

function rendre(
  user: Partial<AuthUser> = {},
  extra: Partial<AuthContextValue> = {},
  onInvitationAcceptee = vi.fn(),
  erreurInvitation?: string,
) {
  const contexte: AuthContextValue = {
    user: { id: 1, username: 'sophie', role: null, onboarding_termine: false, holdings_sans_compte: 0, foyers: [], peut_creer_foyer: true, ...user },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: vi.fn(),
    completeOnboarding: async () => {},
    refetchUser: vi.fn(async () => {}),
    ...extra,
  }
  render(
    <AuthContext.Provider value={contexte}>
      <AucunFoyerPage onInvitationAcceptee={onInvitationAcceptee} erreurInvitation={erreurInvitation} />
    </AuthContext.Provider>,
  )
  return { contexte, onInvitationAcceptee }
}

describe('AucunFoyerPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('annonce que le compte n’appartient à aucun foyer', () => {
    rendre()

    expect(screen.getByRole('heading', { name: "Vous n'appartenez à aucun foyer" })).toBeInTheDocument()
  })

  it('accepte le lien complet collé : envoie seulement le jeton du fragment', async () => {
    vi.mocked(api.accepterInvitation).mockResolvedValue(REJOINT)
    const { onInvitationAcceptee } = rendre()

    fireEvent.change(screen.getByLabelText(/^Lien d'invitation/), { target: { value: 'https://lumen.example/invitation#jeton_ABC-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre le foyer' }))

    await waitFor(() => expect(onInvitationAcceptee).toHaveBeenCalledWith(REJOINT))
    expect(api.accepterInvitation).toHaveBeenCalledWith('jeton_ABC-123')
  })

  it('accepte aussi le jeton seul', async () => {
    vi.mocked(api.accepterInvitation).mockResolvedValue(REJOINT)
    rendre()

    fireEvent.change(screen.getByLabelText(/^Lien d'invitation/), { target: { value: ' jeton_seul ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre le foyer' }))

    await waitFor(() => expect(api.accepterInvitation).toHaveBeenCalledWith('jeton_seul'))
  })

  it('un lien sans jeton est refusé sans appeler le serveur', async () => {
    rendre()

    fireEvent.change(screen.getByLabelText(/^Lien d'invitation/), { target: { value: 'https://lumen.example/invitation' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre le foyer' }))

    expect(await screen.findByText(/ne contient pas de code d'invitation/)).toBeInTheDocument()
    expect(api.accepterInvitation).not.toHaveBeenCalled()
  })

  it('un lien refusé par le serveur affiche son message', async () => {
    vi.mocked(api.accepterInvitation).mockRejectedValue(new Error('Invitation introuvable, expirée ou déjà utilisée.'))
    rendre()

    fireEvent.change(screen.getByLabelText(/^Lien d'invitation/), { target: { value: 'jeton_mort' } })
    fireEvent.click(screen.getByRole('button', { name: 'Rejoindre le foyer' }))

    expect(await screen.findByText('Invitation introuvable, expirée ou déjà utilisée.')).toBeInTheDocument()
  })

  it('« Créer mon foyer » n’est proposé que si l’installation l’autorise', () => {
    rendre({ peut_creer_foyer: false })

    expect(screen.queryByRole('button', { name: 'Créer mon foyer' })).not.toBeInTheDocument()
  })

  it('créer son foyer envoie le nom et la langue de l’appareil, puis recharge l’utilisateur', async () => {
    vi.mocked(api.creerFoyer).mockResolvedValue({} as AuthUser)
    const { contexte } = rendre()

    fireEvent.change(screen.getByLabelText('Nom du foyer (facultatif)'), { target: { value: 'Chez moi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon foyer' }))

    await waitFor(() => expect(contexte.refetchUser).toHaveBeenCalledTimes(1))
    expect(api.creerFoyer).toHaveBeenCalledWith('Chez moi', 'fr')
  })

  it('sans nom saisi, le foyer est créé sans nom', async () => {
    vi.mocked(api.creerFoyer).mockResolvedValue({} as AuthUser)
    rendre()

    fireEvent.click(screen.getByRole('button', { name: 'Créer mon foyer' }))

    await waitFor(() => expect(api.creerFoyer).toHaveBeenCalledWith(null, 'fr'))
  })

  it('supprimer le compte ouvre la fenêtre commune, qui exige de saisir le nom d’utilisateur', async () => {
    vi.mocked(api.apercuSuppressionCompte).mockResolvedValue({
      confirmation_attendue: 'sophie',
      foyers_supprimes: [],
      foyers_quittes: [],
      foyers_bloquants: [],
      peut_supprimer: true,
    })
    vi.mocked(api.supprimerMonCompte).mockResolvedValue(undefined)
    const { contexte } = rendre()

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte' }))
    const champ = await screen.findByLabelText(/Pour confirmer, saisissez votre nom d'utilisateur/)
    const confirmer = screen.getByRole('button', { name: 'Supprimer définitivement' })
    expect(confirmer).toBeDisabled()

    fireEvent.change(champ, { target: { value: 'autre' } })
    expect(confirmer).toBeDisabled()

    fireEvent.change(champ, { target: { value: 'sophie' } })
    expect(confirmer).toBeEnabled()
    fireEvent.click(confirmer)

    await waitFor(() => expect(api.supprimerMonCompte).toHaveBeenCalledWith('sophie'))
    expect(contexte.logout).toHaveBeenCalled()
  })

  it('se déconnecter est toujours possible', () => {
    const { contexte } = rendre()

    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }))

    expect(contexte.logout).toHaveBeenCalled()
  })

  it('propose les foyers restants quand la session n’en a plus de courant', async () => {
    vi.mocked(api.changerFoyerCourant).mockResolvedValue({} as AuthUser)
    rendre({ foyers: [{ id: 12, nom: 'Chez Sophie', role: 'invite' }] })

    expect(screen.getByText('Chez Sophie')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir' }))

    await waitFor(() => expect(api.changerFoyerCourant).toHaveBeenCalledWith(12))
  })

  it('montre l’échec d’une invitation acceptée au retour du SSO', () => {
    rendre({}, {}, vi.fn(), 'Invitation introuvable, expirée ou déjà utilisée.')

    expect(screen.getByText('Invitation introuvable, expirée ou déjà utilisée.')).toBeInTheDocument()
  })
})
