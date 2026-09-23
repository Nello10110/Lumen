import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import { activerLangue } from '../i18n'
import { LangueProvider } from '../i18n/LangueProvider'
import LangueFoyerCard from './LangueFoyerCard'

vi.mock('../api/client', () => ({
  api: { updateLangueFoyer: vi.fn() },
}))

function auth(refetchUser: () => Promise<void>): AuthContextValue {
  return {
    user: { id: 1, username: 'paul', role: 'proprietaire', onboarding_termine: true, holdings_sans_compte: 0, langue: 'fr' },
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: async () => {},
    refetchUser,
  }
}

function afficher(refetchUser = vi.fn().mockResolvedValue(undefined)) {
  render(
    <LangueProvider>
      <AuthContext.Provider value={auth(refetchUser)}>
        <LangueFoyerCard />
      </AuthContext.Provider>
    </LangueProvider>,
  )
  return { refetchUser }
}

afterEach(async () => {
  await activerLangue('fr')
  vi.clearAllMocks()
})

describe('LangueFoyerCard — langue du foyer dans Réglages (backlog § BL)', () => {
  it('présélectionne la langue active', () => {
    afficher()

    expect(screen.getByRole('combobox', { name: "Langue de l'interface" })).toHaveValue('fr')
  })

  it("enregistre la langue choisie pour tout le foyer, puis recharge l'utilisateur", async () => {
    vi.mocked(api.updateLangueFoyer).mockResolvedValue({} as never)
    const { refetchUser } = afficher()

    fireEvent.change(screen.getByRole('combobox', { name: "Langue de l'interface" }), { target: { value: 'de' } })

    await vi.waitFor(() => expect(api.updateLangueFoyer).toHaveBeenCalledWith('de'))
    await vi.waitFor(() => expect(refetchUser).toHaveBeenCalled())
  })

  it("un refus du serveur est affiché, et le sélecteur redevient utilisable", async () => {
    vi.mocked(api.updateLangueFoyer).mockRejectedValue(new Error('Réservé au propriétaire du foyer.'))
    afficher()

    fireEvent.change(screen.getByRole('combobox', { name: "Langue de l'interface" }), { target: { value: 'it' } })

    expect(await screen.findByText('Réservé au propriétaire du foyer.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: "Langue de l'interface" })).toBeEnabled()
  })
})
