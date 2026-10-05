import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur } from '../api/types'
import { PreferencesAffichageProvider } from '../contexts/PreferencesAffichageContext'
import BandeauRepartition from './BandeauRepartition'

vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
    getLignesNonReparties: vi.fn(),
    repartirToutesLesLignes: vi.fn(),
  },
}))

function membre(id: number, nom: string): Detenteur {
  return { id, nom, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' }
}

function renderBandeau(onAttribue = vi.fn()) {
  render(
    <PreferencesAffichageProvider>
      <BandeauRepartition onAttribue={onAttribue} />
    </PreferencesAffichageProvider>,
  )
  return onAttribue
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(api.listDetenteurs).mockResolvedValue([membre(1, 'Alice'), membre(2, 'Bob')])
  vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 0, prets: 0 })
})

describe('BandeauRepartition — vue du foyer (§ BN.1, lot 3)', () => {
  it('annonce les lignes non réparties et propose « Tout attribuer » quand il en reste', async () => {
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 2, prets: 1 })
    renderBandeau()

    expect(await screen.findByText('3 lignes ne sont pas encore réparties entre les membres du foyer.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tout attribuer' })).toBeInTheDocument()
    expect(screen.queryByText(/Vue de/)).not.toBeInTheDocument()
  })

  it('accorde au singulier quand une seule ligne reste', async () => {
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 1, prets: 0 })
    renderBandeau()

    expect(await screen.findByText("1 ligne n'est pas encore répartie entre les membres du foyer.")).toBeInTheDocument()
  })

  it("n'affiche rien quand tout est réparti et qu'aucun membre n'est sélectionné", async () => {
    renderBandeau()

    await waitFor(() => expect(api.getLignesNonReparties).toHaveBeenCalled())
    await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tout attribuer' })).not.toBeInTheDocument()
  })

  it("n'affiche rien dans un foyer sans membre, même s'il reste des lignes non réparties", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 4, prets: 0 })
    renderBandeau()

    await waitFor(() => expect(api.getLignesNonReparties).toHaveBeenCalled())
    await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    expect(screen.queryByText(/réparties? entre les membres/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tout attribuer' })).not.toBeInTheDocument()
  })

  it("n'affiche rien quand le décompte est refusé (403, compte en lecture seule) : pas d'erreur que l'utilisateur ne peut pas corriger", async () => {
    vi.mocked(api.getLignesNonReparties).mockRejectedValue(new Error('Accès refusé'))
    renderBandeau()

    await waitFor(() => expect(api.getLignesNonReparties).toHaveBeenCalled())
    await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Accès refusé')).not.toBeInTheDocument()
  })

  it("n'affiche rien quand la liste des membres n'est pas lisible", async () => {
    vi.mocked(api.listDetenteurs).mockRejectedValue(new Error('403'))
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 2, prets: 0 })
    renderBandeau()

    await waitFor(() => expect(api.getLignesNonReparties).toHaveBeenCalled())
    await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Tout attribuer' })).not.toBeInTheDocument()
  })
})

describe("BandeauRepartition — vue d'un membre (§ BN.1, lot 3)", () => {
  beforeEach(() => localStorage.setItem('patrimoine:detenteur-id', '1'))

  it('dit « Vue de Alice » et que les lignes non réparties ne sont pas comptées', async () => {
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 2, prets: 1 })
    renderBandeau()

    expect(await screen.findByText(/Vue de Alice : les valeurs sont au prorata de ses parts\./)).toBeInTheDocument()
    expect(screen.getByText(/3 lignes non réparties ne sont pas comptées\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tout attribuer' })).toBeInTheDocument()
    expect(screen.queryByText(/ne sont pas encore réparties/)).not.toBeInTheDocument()
  })

  it("reste affiché sans décompte ni bouton quand tout est réparti : le rappel « Vue de Alice » demeure", async () => {
    renderBandeau()

    expect(await screen.findByText(/Vue de Alice/)).toBeInTheDocument()
    expect(screen.queryByText(/ne sont pas comptées/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tout attribuer' })).not.toBeInTheDocument()
  })

  it("singulier : « 1 ligne non répartie n'est pas comptée »", async () => {
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 0, prets: 1 })
    renderBandeau()

    expect(await screen.findByText(/1 ligne non répartie n'est pas comptée\./)).toBeInTheDocument()
  })

  it('un membre mémorisé qui ne fait plus partie du foyer ne produit pas « Vue de … »', async () => {
    localStorage.setItem('patrimoine:detenteur-id', '99')
    renderBandeau()

    await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    await waitFor(() => expect(api.getLignesNonReparties).toHaveBeenCalled())
    expect(screen.queryByText(/Vue de/)).not.toBeInTheDocument()
  })
})

describe('BandeauRepartition — « Tout attribuer »', () => {
  it("la fenêtre reste affichée après l'attribution même quand le bandeau disparaît (tout est réparti), et onAttribue est appelé", async () => {
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 2, prets: 1 })
    vi.mocked(api.repartirToutesLesLignes).mockResolvedValue({ actifs: 2, prets: 1 })
    const onAttribue = renderBandeau()
    fireEvent.click(await screen.findByRole('button', { name: 'Tout attribuer' }))
    await screen.findByRole('dialog')
    await screen.findByTestId('apercu-lignes')
    // Après l'attribution, le décompte relu par le bandeau est à zéro : il se retire.
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 0, prets: 0 })

    fireEvent.click(screen.getByRole('button', { name: 'Attribuer' }))

    expect(await screen.findByText("C'est fait : 2 actifs et 1 prêt ont maintenant des parts.")).toBeInTheDocument()
    expect(onAttribue).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByText(/ne sont pas encore réparties/)).not.toBeInTheDocument())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText("C'est fait : 2 actifs et 1 prêt ont maintenant des parts.")).toBeInTheDocument()
  })

  it('fermer la fenêtre sans attribuer ne change rien et ne déclenche aucune écriture', async () => {
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 1, prets: 0 })
    const onAttribue = renderBandeau()
    fireEvent.click(await screen.findByRole('button', { name: 'Tout attribuer' }))
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.repartirToutesLesLignes).not.toHaveBeenCalled()
    expect(onAttribue).not.toHaveBeenCalled()
  })

  it('le décompte est relu quand la page change la clé `rechargement`', async () => {
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 1, prets: 0 })
    const { rerender } = render(
      <PreferencesAffichageProvider>
        <BandeauRepartition rechargement={0} onAttribue={vi.fn()} />
      </PreferencesAffichageProvider>,
    )
    await screen.findByText(/1 ligne n'est pas encore répartie/)
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 0, prets: 0 })

    rerender(
      <PreferencesAffichageProvider>
        <BandeauRepartition rechargement={1} onAttribue={vi.fn()} />
      </PreferencesAffichageProvider>,
    )

    await waitFor(() => expect(screen.queryByText(/1 ligne n'est pas encore répartie/)).not.toBeInTheDocument())
    expect(api.getLignesNonReparties).toHaveBeenCalledTimes(2)
  })
})
