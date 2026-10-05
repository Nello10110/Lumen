import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur, QuotiteEntree } from '../api/types'
import RepartirModale from './RepartirModale'

vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
  },
}))

function membre(id: number, nom: string): Detenteur {
  return { id, nom, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' }
}

function renderModale(props: Partial<Parameters<typeof RepartirModale>[0]> = {}) {
  const enregistrer = props.enregistrer ?? vi.fn().mockResolvedValue(undefined)
  const onClose = props.onClose ?? vi.fn()
  const onEnregistre = props.onEnregistre ?? vi.fn()
  render(<RepartirModale nom="PEA" enregistrer={enregistrer} onClose={onClose} onEnregistre={onEnregistre} {...props} />)
  return { enregistrer, onClose, onEnregistre }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.listDetenteurs).mockResolvedValue([membre(1, 'Alice'), membre(2, 'Bob')])
})

describe('RepartirModale (§ BN.1, lot 3)', () => {
  it('titre la fenêtre du nom de la ligne : « Répartir « PEA » »', async () => {
    renderModale({ nom: 'PEA' })

    expect(await screen.findByRole('heading', { name: 'Répartir « PEA »' })).toBeInTheDocument()
  })

  it("propose des parts égales quand rien n'est enregistré, sans écrire avant « Enregistrer »", async () => {
    const { enregistrer } = renderModale()

    expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(50)
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(50)
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it("s'ouvre sur la répartition actuelle quand `chargerValeursInitiales` en fournit une", async () => {
    const quotites: QuotiteEntree[] = [
      { detenteur_id: 1, quotite_pct: 80 },
      { detenteur_id: 2, quotite_pct: 20 },
    ]
    renderModale({ chargerValeursInitiales: () => Promise.resolve({ quotites }) })

    await waitFor(() => expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(80))
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(20)
  })

  it('« Enregistrer la répartition » envoie les parts saisies, confirme, puis prévient l\'appelant (qui recharge et ferme)', async () => {
    const { enregistrer, onEnregistre } = renderModale()
    await screen.findByLabelText('Part de Alice (%)')
    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '75' } })

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la répartition' }))

    await waitFor(() => expect(onEnregistre).toHaveBeenCalledTimes(1))
    expect(enregistrer).toHaveBeenCalledWith([
      { detenteur_id: 1, quotite_pct: 25 },
      { detenteur_id: 2, quotite_pct: 75 },
    ])
    expect(await screen.findByText('Répartition enregistrée.')).toBeInTheDocument()
  })

  it("désactive l'enregistrement tant que le total n'est pas 100 %", async () => {
    const { enregistrer } = renderModale()
    await screen.findByLabelText('Part de Alice (%)')

    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '10' } })

    expect(screen.getByRole('button', { name: 'Enregistrer la répartition' })).toBeDisabled()
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it("un échec d'enregistrement s'affiche et ne prévient pas l'appelant", async () => {
    const enregistrer = vi.fn().mockRejectedValue(new Error('Serveur indisponible'))
    const { onEnregistre } = renderModale({ enregistrer })
    await screen.findByLabelText('Part de Alice (%)')

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la répartition' }))

    expect(await screen.findByText('Serveur indisponible')).toBeInTheDocument()
    expect(onEnregistre).not.toHaveBeenCalled()
  })

  it("affiche l'introduction fournie par l'appelant (ex. « Bob est ajouté à ce compte »)", async () => {
    renderModale({ introduction: 'Bob est ajouté à ce compte : ajustez les parts puis enregistrez.' })

    expect(await screen.findByText('Bob est ajouté à ce compte : ajustez les parts puis enregistrez.')).toBeInTheDocument()
  })

  it('la croix et Échap ferment sans enregistrer', async () => {
    const { enregistrer, onClose } = renderModale()
    await screen.findByLabelText('Part de Alice (%)')

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2))
    expect(enregistrer).not.toHaveBeenCalled()
  })
})
