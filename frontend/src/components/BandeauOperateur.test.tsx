import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser } from '../api/types'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'
import BandeauOperateur from './BandeauOperateur'

vi.mock('../api/client', () => ({
  api: { amorcerOperateur: vi.fn() },
}))

const PROPRIETAIRE: AuthUser = {
  id: 1,
  username: 'proprio',
  role: 'proprietaire',
  onboarding_termine: true,
  holdings_sans_compte: 0,
  peut_amorcer_operateur: true,
}

function contexte(user: AuthUser, refetchUser = vi.fn().mockResolvedValue(undefined)): AuthContextValue {
  return {
    user,
    loading: false,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    completeOnboarding: async () => {},
    refetchUser,
  }
}

function rendre(valeur: AuthContextValue) {
  return render(
    <AuthContext.Provider value={valeur}>
      <BandeauOperateur />
    </AuthContext.Provider>,
  )
}

describe('BandeauOperateur', () => {
  beforeEach(() => {
    vi.mocked(api.amorcerOperateur).mockReset()
  })

  it('est proposé au propriétaire tant que peut_amorcer_operateur est vrai, formulaire replié', () => {
    rendre(contexte(PROPRIETAIRE))

    expect(screen.getByRole('heading', { name: 'Créer le compte opérateur' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Créer l'opérateur…" })).toBeInTheDocument()
    expect(screen.queryByLabelText("Nom d'utilisateur")).not.toBeInTheDocument()
  })

  it("n'apparaît pas quand le propriétaire ne peut plus amorcer l'opérateur (il existe, ou plusieurs foyers)", () => {
    rendre(contexte({ ...PROPRIETAIRE, peut_amorcer_operateur: false, operateur_existe: true }))

    expect(screen.queryByRole('heading', { name: 'Créer le compte opérateur' })).not.toBeInTheDocument()
  })

  it('refuse deux mots de passe différents sans appeler le serveur', () => {
    rendre(contexte(PROPRIETAIRE))
    fireEvent.click(screen.getByRole('button', { name: "Créer l'opérateur…" }))

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'mot-de-passe-1' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'autre-chose-12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte opérateur' }))

    expect(screen.getByText('Les deux mots de passe ne sont pas identiques.')).toBeInTheDocument()
    expect(api.amorcerOperateur).not.toHaveBeenCalled()
  })

  it("crée l'opérateur, recharge l'utilisateur et garde l'explication malgré la fin de peut_amorcer_operateur", async () => {
    vi.mocked(api.amorcerOperateur).mockResolvedValue({ id: 2, username: 'admin', created_at: '2026-10-01T10:00:00' })
    const refetchUser = vi.fn().mockResolvedValue(undefined)
    const { rerender } = rendre(contexte(PROPRIETAIRE, refetchUser))
    fireEvent.click(screen.getByRole('button', { name: "Créer l'opérateur…" }))

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: ' admin ' } })
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'mot-de-passe-1' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'mot-de-passe-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte opérateur' }))

    expect(await screen.findByText('Compte opérateur « admin » créé.')).toBeInTheDocument()
    expect(api.amorcerOperateur).toHaveBeenCalledWith('admin', 'mot-de-passe-1')
    expect(refetchUser).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/connecte-toi avec lui/)).toBeInTheDocument()

    // L'utilisateur rechargé n'a plus `peut_amorcer_operateur` : le bandeau reste, pour l'explication.
    rerender(
      <AuthContext.Provider value={contexte({ ...PROPRIETAIRE, peut_amorcer_operateur: false, operateur_existe: true }, refetchUser)}>
        <BandeauOperateur />
      </AuthContext.Provider>,
    )
    expect(screen.getByText('Compte opérateur « admin » créé.')).toBeInTheDocument()
  })

  it("affiche le refus du serveur et garde le formulaire", async () => {
    vi.mocked(api.amorcerOperateur).mockRejectedValue(new Error("Ce nom d'utilisateur est déjà pris."))
    rendre(contexte(PROPRIETAIRE))
    fireEvent.click(screen.getByRole('button', { name: "Créer l'opérateur…" }))

    fireEvent.change(screen.getByLabelText("Nom d'utilisateur"), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText(/^Mot de passe/), { target: { value: 'mot-de-passe-1' } })
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'mot-de-passe-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte opérateur' }))

    expect(await screen.findByText("Ce nom d'utilisateur est déjà pris.")).toBeInTheDocument()
    expect(screen.getByLabelText("Nom d'utilisateur")).toBeInTheDocument()
  })
})
