import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur } from '../api/types'
import ToutAttribuerModale from './ToutAttribuerModale'

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

function renderModale(props: { onClose?: () => void; onAttribue?: () => void } = {}) {
  const onClose = props.onClose ?? vi.fn()
  const onAttribue = props.onAttribue ?? vi.fn()
  render(<ToutAttribuerModale onClose={onClose} onAttribue={onAttribue} />)
  return { onClose, onAttribue }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.listDetenteurs).mockResolvedValue([membre(1, 'Alice'), membre(2, 'Bob')])
  vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 2, prets: 1 })
  vi.mocked(api.repartirToutesLesLignes).mockResolvedValue({ actifs: 2, prets: 1 })
})

describe('ToutAttribuerModale — aperçu (§ BN.1, lot 3)', () => {
  it("lit à l'ouverture le nombre de lignes concernées : « 2 actifs et 1 prêt »", async () => {
    renderModale()

    expect(await screen.findByTestId('apercu-lignes')).toHaveTextContent('2 actifs et 1 prêt')
    expect(api.getLignesNonReparties).toHaveBeenCalledTimes(1)
  })

  it('propose des parts égales par défaut entre les membres', async () => {
    renderModale()
    await screen.findByTestId('apercu-lignes')

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(50)
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(50)
  })

  it("avec un seul membre, la répartition proposée est 100 % pour lui", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([membre(1, 'Alice')])
    renderModale()
    await screen.findByTestId('apercu-lignes')

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(100)
  })

  it("n'écrit RIEN avant le clic sur « Attribuer »", async () => {
    renderModale()
    await screen.findByTestId('apercu-lignes')

    // Modifier la répartition ne vaut pas validation.
    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '30' } })

    expect(api.repartirToutesLesLignes).not.toHaveBeenCalled()
  })
})

describe("ToutAttribuerModale — attribution (§ BN.1, lot 3)", () => {
  it('« Attribuer » envoie les parts égales proposées, puis dit « C\'est fait » et prévient la page', async () => {
    const { onAttribue } = renderModale()
    await screen.findByTestId('apercu-lignes')

    fireEvent.click(screen.getByRole('button', { name: 'Attribuer' }))

    expect(await screen.findByText("C'est fait : 2 actifs et 1 prêt ont maintenant des parts.")).toBeInTheDocument()
    expect(api.repartirToutesLesLignes).toHaveBeenCalledTimes(1)
    expect(api.repartirToutesLesLignes).toHaveBeenCalledWith([
      { detenteur_id: 1, quotite_pct: 50 },
      { detenteur_id: 2, quotite_pct: 50 },
    ])
    expect(onAttribue).toHaveBeenCalledTimes(1)
  })

  it("envoie la répartition choisie par l'utilisateur (70 / 30)", async () => {
    renderModale()
    await screen.findByTestId('apercu-lignes')
    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '70' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '30' } })

    fireEvent.click(screen.getByRole('button', { name: 'Attribuer' }))

    await screen.findByText(/C'est fait/)
    expect(api.repartirToutesLesLignes).toHaveBeenCalledWith([
      { detenteur_id: 1, quotite_pct: 70 },
      { detenteur_id: 2, quotite_pct: 30 },
    ])
  })

  it('avec un seul membre, envoie 100 % pour lui', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([membre(7, 'Alice')])
    renderModale()
    await screen.findByTestId('apercu-lignes')

    fireEvent.click(screen.getByRole('button', { name: 'Attribuer' }))

    await screen.findByText(/C'est fait/)
    expect(api.repartirToutesLesLignes).toHaveBeenCalledWith([{ detenteur_id: 7, quotite_pct: 100 }])
  })

  it('avec trois membres, les parts égales absorbent l\'arrondi dans le dernier : 33,33 / 33,33 / 33,34', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([membre(1, 'Alice'), membre(2, 'Bob'), membre(3, 'Clara')])
    renderModale()
    await screen.findByTestId('apercu-lignes')

    fireEvent.click(screen.getByRole('button', { name: 'Attribuer' }))

    await screen.findByText(/C'est fait/)
    expect(api.repartirToutesLesLignes).toHaveBeenCalledWith([
      { detenteur_id: 1, quotite_pct: 33.33 },
      { detenteur_id: 2, quotite_pct: 33.33 },
      { detenteur_id: 3, quotite_pct: 33.34 },
    ])
  })

  it("désactive « Attribuer » tant que le total des parts n'est pas 100 % (aucune écriture possible)", async () => {
    renderModale()
    await screen.findByTestId('apercu-lignes')

    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '60' } })

    const attribuer = screen.getByRole('button', { name: 'Attribuer' })
    expect(attribuer).toBeDisabled()
    fireEvent.click(attribuer)
    expect(api.repartirToutesLesLignes).not.toHaveBeenCalled()
  })

  it("affiche l'erreur du serveur, garde la fenêtre ouverte et ne prévient pas la page", async () => {
    vi.mocked(api.repartirToutesLesLignes).mockRejectedValue(new Error('Une ligne a changé entre-temps'))
    const { onAttribue } = renderModale()
    await screen.findByTestId('apercu-lignes')

    fireEvent.click(screen.getByRole('button', { name: 'Attribuer' }))

    expect(await screen.findByText('Une ligne a changé entre-temps')).toBeInTheDocument()
    expect(onAttribue).not.toHaveBeenCalled()
    expect(screen.queryByText(/C'est fait/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Attribuer' })).toBeEnabled()
  })

  it("rien à répartir : dit que tout est déjà réparti et ne propose pas « Attribuer »", async () => {
    vi.mocked(api.getLignesNonReparties).mockResolvedValue({ actifs: 0, prets: 0 })
    renderModale()

    expect(await screen.findByText('Toutes les lignes sont déjà réparties.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Attribuer' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('apercu-lignes')).not.toBeInTheDocument()
  })

  it("échec de lecture de l'aperçu : affiche l'erreur, aucune écriture possible", async () => {
    vi.mocked(api.getLignesNonReparties).mockRejectedValue(new Error('Accès refusé'))
    renderModale()

    expect(await screen.findByText('Accès refusé')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Attribuer' })).toBeDisabled()
    expect(api.repartirToutesLesLignes).not.toHaveBeenCalled()
  })
})

describe('ToutAttribuerModale — fermeture sans effet', () => {
  it('« Annuler » ferme sans aucun appel d\'écriture', async () => {
    const { onClose, onAttribue } = renderModale()
    await screen.findByTestId('apercu-lignes')

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onAttribue).not.toHaveBeenCalled()
    expect(api.repartirToutesLesLignes).not.toHaveBeenCalled()
  })

  it('la touche Échap ferme sans aucun appel d\'écriture', async () => {
    const { onClose } = renderModale()
    await screen.findByTestId('apercu-lignes')

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(api.repartirToutesLesLignes).not.toHaveBeenCalled()
  })

  it('après l\'attribution, « Fermer » ferme la fenêtre', async () => {
    const { onClose } = renderModale()
    await screen.findByTestId('apercu-lignes')
    fireEvent.click(screen.getByRole('button', { name: 'Attribuer' }))
    await screen.findByText(/C'est fait/)

    // Deux commandes « Fermer » (croix et bouton) : les deux ferment.
    const fermer = screen.getAllByRole('button', { name: 'Fermer' })
    fireEvent.click(fermer[fermer.length - 1])

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
