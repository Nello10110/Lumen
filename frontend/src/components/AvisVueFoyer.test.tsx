import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { PreferencesAffichageProvider } from '../contexts/PreferencesAffichageContext'
import AvisVueFoyer from './AvisVueFoyer'

vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
  },
}))

const HORODATAGE = '2026-01-01T00:00:00'

function rendre(ecran: 'analyse' | 'rapport') {
  return render(
    <PreferencesAffichageProvider>
      <AvisVueFoyer ecran={ecran} />
    </PreferencesAffichageProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(api.listDetenteurs).mockResolvedValue([
    { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE },
    { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE },
  ])
})

describe('AvisVueFoyer (§ BN.1, lot 3)', () => {
  it("n'affiche rien et ne lit pas les membres tant qu'aucun membre n'est sélectionné", async () => {
    rendre('analyse')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(api.listDetenteurs).not.toHaveBeenCalled()
  })

  it("sur l'Analyse, dit que l'écran montre le foyer entier et que la vue du membre sélectionné ne s'y applique pas", async () => {
    localStorage.setItem('patrimoine:detenteur-id', '1')
    rendre('analyse')

    expect(await screen.findByText(/Cet écran montre le foyer entier : la vue de Alice ne s'y applique pas/)).toBeInTheDocument()
  })

  it('sur le Rapport, le texte est celui du rapport et cite le membre sélectionné', async () => {
    localStorage.setItem('patrimoine:detenteur-id', '2')
    rendre('rapport')

    expect(await screen.findByText('Ce rapport porte sur le foyer entier : la vue de Bob ne s\'y applique pas.')).toBeInTheDocument()
  })

  it("un membre mémorisé qui n'existe plus ne produit aucun avis", async () => {
    localStorage.setItem('patrimoine:detenteur-id', '99')
    rendre('rapport')

    await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
