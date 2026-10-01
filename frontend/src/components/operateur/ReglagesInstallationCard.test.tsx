import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiOperateur } from '../../api/client'
import type { ReglagesInstallation } from '../../api/types'
import ReglagesInstallationCard from './ReglagesInstallationCard'

vi.mock('../../api/client', () => ({
  apiOperateur: { updateReglagesInstallation: vi.fn() },
}))

const REGLAGES: ReglagesInstallation = {
  mode_naissance_foyers: 'ferme',
  sso_cree_son_foyer: true,
  creation_foyer_par_compte_sans_foyer: true,
  moteur: 'sqlite',
  separation_par_la_base: false,
}

describe('ReglagesInstallationCard', () => {
  beforeEach(() => {
    vi.mocked(apiOperateur.updateReglagesInstallation).mockReset()
  })

  it("montre l'état courant des trois réglages", () => {
    render(<ReglagesInstallationCard reglages={REGLAGES} onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'Fermé' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Sur invitation' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Un nouveau compte SSO crée son foyer' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Un compte sans foyer peut créer le sien' })).toBeChecked()
  })

  it('changer le mode envoie ce seul champ et reprend la réponse du serveur', async () => {
    const reponse = { ...REGLAGES, mode_naissance_foyers: 'invitation' as const }
    vi.mocked(apiOperateur.updateReglagesInstallation).mockResolvedValue(reponse)
    const onChange = vi.fn()
    render(<ReglagesInstallationCard reglages={REGLAGES} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Sur invitation' }))

    await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(reponse))
    expect(apiOperateur.updateReglagesInstallation).toHaveBeenCalledWith({ mode_naissance_foyers: 'invitation' })
  })

  it('les cases envoient la valeur inverse, une seule à la fois', async () => {
    vi.mocked(apiOperateur.updateReglagesInstallation).mockResolvedValue({ ...REGLAGES, sso_cree_son_foyer: false })
    render(<ReglagesInstallationCard reglages={REGLAGES} onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Un nouveau compte SSO crée son foyer' }))
    await vi.waitFor(() => expect(apiOperateur.updateReglagesInstallation).toHaveBeenCalledWith({ sso_cree_son_foyer: false }))

    vi.mocked(apiOperateur.updateReglagesInstallation).mockResolvedValue({ ...REGLAGES, creation_foyer_par_compte_sans_foyer: false })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Un compte sans foyer peut créer le sien' }))
    await vi.waitFor(() =>
      expect(apiOperateur.updateReglagesInstallation).toHaveBeenLastCalledWith({ creation_foyer_par_compte_sans_foyer: false }),
    )
  })

  it("affiche l'erreur du serveur sans changer l'état affiché", async () => {
    vi.mocked(apiOperateur.updateReglagesInstallation).mockRejectedValue(new Error('Enregistrement impossible'))
    const onChange = vi.fn()
    render(<ReglagesInstallationCard reglages={REGLAGES} onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Sur invitation' }))

    expect(await screen.findByText('Enregistrement impossible')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
