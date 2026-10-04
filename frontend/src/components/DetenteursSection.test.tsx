import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur, QuotiteDetenteurItem } from '../api/types'
import DetenteursSection from './DetenteursSection'

vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
    createDetenteur: vi.fn(),
    setHoldingQuotites: vi.fn(),
  },
}))

const DETENTEURS: Detenteur[] = [
  { id: 1, nom: 'Alice', created_at: '2020-01-01T00:00:00', updated_at: '2020-01-01T00:00:00' },
  { id: 2, nom: 'Bob', created_at: '2020-01-01T00:00:00', updated_at: '2020-01-01T00:00:00' },
]

const QUOTITES: QuotiteDetenteurItem[] = [
  { detenteur_id: 1, detenteur_nom: 'Alice', quotite_pct: 60, part_detenue: 180000, part_nette: 180000 },
  { detenteur_id: 2, detenteur_nom: 'Bob', quotite_pct: 40, part_detenue: 120000, part_nette: 120000 },
]

function rendre(props: Partial<React.ComponentProps<typeof DetenteursSection>> = {}) {
  return render(
    <MemoryRouter>
      <DetenteursSection holdingId={7} quotitesInitiales={QUOTITES} valeur={300000} {...props} />
    </MemoryRouter>,
  )
}

describe('DetenteursSection — « Qui le détient » (§ BN.1, lot 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.listDetenteurs).mockResolvedValue(DETENTEURS)
  })

  it('s’ouvre sur la répartition enregistrée, total visible', async () => {
    rendre()

    expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(60)
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(40)
    expect(screen.getByTestId('total-repartition')).toHaveTextContent(/Total : 100\s%/)
  })

  it('sans emprunt, affiche la part détenue de chacun ; avec un emprunt, la part nette', async () => {
    const { unmount } = rendre()
    await screen.findByLabelText('Part de Alice (%)')
    expect(screen.getAllByText(/Part détenue :/)).toHaveLength(2)
    expect(screen.queryByText(/Part nette :/)).not.toBeInTheDocument()
    unmount()

    rendre({ detteBien: 100000, suitPret: true })
    await screen.findByLabelText('Part de Alice (%)')
    // 60 % de (300 000 − 100 000) = 120 000 pour Alice ; 40 % = 80 000 pour Bob.
    expect(screen.getByText(/Part nette\s:\s120\s000\s€/)).toBeInTheDocument()
    expect(screen.getByText(/Part nette\s:\s80\s000\s€/)).toBeInTheDocument()
    expect(screen.getByText('Le prêt suit la même répartition.')).toBeInTheDocument()
  })

  it('un changement de part n’est enregistré qu’au clic, puis le parent est prévenu', async () => {
    vi.mocked(api.setHoldingQuotites).mockResolvedValue({ ok: true })
    const onEnregistre = vi.fn()
    rendre({ onEnregistre })
    const alice = await screen.findByLabelText('Part de Alice (%)')

    fireEvent.change(alice, { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '50' } })
    expect(api.setHoldingQuotites).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la répartition' }))

    await vi.waitFor(() =>
      expect(api.setHoldingQuotites).toHaveBeenCalledWith(7, [
        { detenteur_id: 1, quotite_pct: 50 },
        { detenteur_id: 2, quotite_pct: 50 },
      ]),
    )
    await vi.waitFor(() => expect(onEnregistre).toHaveBeenCalled())
    expect(await screen.findByText('Répartition enregistrée.')).toBeInTheDocument()
  })

  it('sans membre déclaré, dit que le bien appartient au foyer et propose d’en ajouter un', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    rendre({ quotitesInitiales: [] })

    expect(await screen.findByText(/Aucun membre du foyer n'est encore déclaré/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter un membre du foyer' })).toBeInTheDocument()
  })

  it('l’ajout du premier membre recharge la liste et propose 100 % pour lui', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValueOnce([]).mockResolvedValue([DETENTEURS[0]])
    vi.mocked(api.createDetenteur).mockResolvedValue(DETENTEURS[0])
    rendre({ quotitesInitiales: [] })

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter un membre du foyer' }))
    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(100)
    expect(api.setHoldingQuotites).not.toHaveBeenCalled()
  })
})
