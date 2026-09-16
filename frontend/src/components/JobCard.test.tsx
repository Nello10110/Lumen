import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { EtatRafraichissement, ScheduledJob } from '../api/types'
import JobCard from './JobCard'

vi.mock('../api/client', () => ({
  api: {
    updateJob: vi.fn(),
    runJobNow: vi.fn(),
    getRefreshStatus: vi.fn(),
    listJobs: vi.fn(),
  },
}))

const ETAT_INACTIF: EtatRafraichissement = {
  en_cours: false,
  positions_traitees: 0,
  positions_total: 0,
  demarre_le: null,
  termine_le: null,
  statut: null,
  message: null,
}

function job(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  return {
    job_key: 'market_data_refresh',
    enabled: true,
    intervalle_heures: 24,
    derniere_execution: null,
    dernier_statut: null,
    dernier_message: null,
    ...overrides,
  }
}

describe('JobCard', () => {
  beforeEach(() => {
    vi.mocked(api.runJobNow).mockResolvedValue(job())
    vi.mocked(api.getRefreshStatus).mockResolvedValue(ETAT_INACTIF)
  })

  it('« Lancer maintenant » déclenche runJobNow sans forcer les non-cotables', async () => {
    render(<JobCard job={job()} onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Lancer maintenant' }))

    expect(api.runJobNow).toHaveBeenCalledWith('market_data_refresh', false)
  })

  it('affiche un bouton dédié pour forcer les cotations indisponibles, uniquement pour market_data_refresh', () => {
    render(<JobCard job={job()} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Forcer aussi les cotations indisponibles/ })).toBeInTheDocument()
  })

  it('le bouton de force appelle runJobNow avec forcerNonCotables=true (retour utilisateur du 16/09/2026)', async () => {
    render(<JobCard job={job()} onChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Forcer aussi les cotations indisponibles/ }))

    expect(api.runJobNow).toHaveBeenCalledWith('market_data_refresh', true)
  })

  it("n'affiche pas le bouton de force pour un autre job", () => {
    render(<JobCard job={job({ job_key: 'justetf_refresh' })} onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Forcer aussi les cotations indisponibles/ })).not.toBeInTheDocument()
  })
})
