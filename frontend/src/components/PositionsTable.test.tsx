import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Holding } from '../api/types'
import { PreferencesAffichageProvider } from '../contexts/PreferencesAffichageContext'
import { simulerLargeurEcran } from '../test/matchMedia'
import PositionsTable from './PositionsTable'

// Seuls les ajouts du lot 3 (§ BN.1) sont verrouillés ici : badge « Non réparti », lien « Répartir »,
// mention « 50 % de … » de la vue d'un membre. Le reste du tableau est couvert par PortefeuillePage.test.tsx.
vi.mock('../api/client', () => ({
  api: {
    listComptes: vi.fn().mockResolvedValue([]),
    listEtablissements: vi.fn().mockResolvedValue([]),
    listDetenteurs: vi.fn().mockResolvedValue([]),
  },
}))

/** Les formats français séparent milliers et unité par des espaces insécables : on les normalise. */
function normaliser(texte: string | null): string {
  return (texte ?? '').replace(/[  ]/g, ' ')
}

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 1,
    ticker: 'AAA',
    nom: 'Titre A',
    quantite: 10,
    prix_revient_moyen: 100,
    cout_acquisition_total: 100,
    compte: null,
    type_actif: 'STOCK',
    origine: 'manuel',
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
    market_data: null,
    rendement_depuis_achat_pct: null,
    rendement_annualise_pct: null,
    valeur: 1000,
    valeur_estimee: null,
    date_valeur_estimee: null,
    taux_pct: null,
    zone_geo: null,
    secteur: null,
    versement_mensuel: null,
    date_acquisition: null,
    ...overrides,
  }
}

function renderTable(rows: Holding[], onRepartir?: (h: Holding) => void) {
  return render(
    <PreferencesAffichageProvider>
      <PositionsTable
        rows={rows}
        onSelectHolding={vi.fn()}
        onRequestDelete={vi.fn()}
        onSaved={vi.fn()}
        comptes={[]}
        etablissements={[]}
        onRepartir={onRepartir}
      />
    </PreferencesAffichageProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  simulerLargeurEcran(false)
  vi.mocked(api.listDetenteurs).mockResolvedValue([])
})

describe.each([
  { nom: 'tableau (desktop)', mobile: false },
  { nom: 'cartes (mobile)', mobile: true },
])('PositionsTable — répartition, $nom (§ BN.1, lot 3)', ({ mobile }) => {
  beforeEach(() => simulerLargeurEcran(mobile))

  it('badge « Non réparti » et lien « Répartir » seulement si onRepartir est fourni ET repartie === false', () => {
    renderTable([holding({ id: 1, ticker: 'AAA', repartie: false }), holding({ id: 2, ticker: 'BBB', repartie: true })], vi.fn())

    expect(screen.getAllByText('Non réparti')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Répartir « AAA » entre les membres du foyer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Répartir « BBB »/ })).not.toBeInTheDocument()
  })

  it("sans onRepartir (foyer sans membre), aucun badge même pour une ligne non répartie", () => {
    renderTable([holding({ id: 1, ticker: 'AAA', repartie: false })])

    expect(screen.queryByText('Non réparti')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Répartir/ })).not.toBeInTheDocument()
  })

  it("une ligne dont `repartie` est absent (ancien serveur) n'est jamais signalée non répartie", () => {
    renderTable([holding({ id: 1, ticker: 'AAA' })], vi.fn())

    expect(screen.queryByText('Non réparti')).not.toBeInTheDocument()
  })

  it('« Répartir » appelle onRepartir avec la ligne concernée et n\'ouvre pas la fiche de la ligne', () => {
    const onRepartir = vi.fn()
    const onSelectHolding = vi.fn()
    const ligne = holding({ id: 5, ticker: 'AAA', repartie: false })
    render(
      <PreferencesAffichageProvider>
        <PositionsTable
          rows={[ligne]}
          onSelectHolding={onSelectHolding}
          onRequestDelete={vi.fn()}
          onSaved={vi.fn()}
          comptes={[]}
          etablissements={[]}
          onRepartir={onRepartir}
        />
      </PreferencesAffichageProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Répartir « AAA »/ }))

    expect(onRepartir).toHaveBeenCalledWith(expect.objectContaining({ id: 5, ticker: 'AAA' }))
    expect(onSelectHolding).not.toHaveBeenCalled()
  })

  it('affiche « 50 % de 300 000 € » quand quotite_pct et valeur_ligne sont renseignés (vue d\'un membre)', () => {
    renderTable([holding({ id: 1, ticker: 'AAA', valeur: 150000, quotite_pct: 50, valeur_ligne: 300000 })])

    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && normaliser(el.textContent) === '50 % de 300 000 €')).toBeInTheDocument()
  })

  it('pas de mention en vue du foyer (quotite_pct absent), ni si valeur_ligne manque', () => {
    renderTable([
      holding({ id: 1, ticker: 'AAA', valeur: 1000 }),
      holding({ id: 2, ticker: 'BBB', valeur: 500, quotite_pct: 50, valeur_ligne: null }),
      holding({ id: 3, ticker: 'CCC', valeur: 500, quotite_pct: null, valeur_ligne: 1000 }),
    ])

    expect(screen.queryByText(/ de \d/)).not.toBeInTheDocument()
  })

  it('une mention par ligne, avec le pourcentage et la valeur entière de CETTE ligne', () => {
    renderTable([
      holding({ id: 1, ticker: 'AAA', valeur: 150000, quotite_pct: 50, valeur_ligne: 300000 }),
      holding({ id: 2, ticker: 'BBB', valeur: 25000, quotite_pct: 25, valeur_ligne: 100000 }),
    ])

    const mentions = screen.getAllByText((_, el) => el?.tagName === 'SPAN' && /^\d+ % de /.test(normaliser(el.textContent)))
    expect(mentions.map((m) => normaliser(m.textContent))).toEqual(['50 % de 300 000 €', '25 % de 100 000 €'])
  })
})

describe('PositionsTable — total (§ BN.1, lot 3)', () => {
  it('desktop : le total du pied est la somme des `valeur` affichées (parts du membre), pas des valeurs entières des lignes', () => {
    renderTable([
      holding({ id: 1, ticker: 'AAA', valeur: 150000, quotite_pct: 50, valeur_ligne: 300000 }),
      holding({ id: 2, ticker: 'BBB', valeur: 25000, quotite_pct: 25, valeur_ligne: 100000 }),
    ])

    const pied = document.querySelector('tfoot') as HTMLElement
    expect(normaliser(within(pied).getByText(/€/).textContent)).toBe('175 000,00 €')
    expect(within(pied).getByText('2 positions')).toBeInTheDocument()
  })

  it('mobile : le total sous les cartes est la même somme des `valeur` affichées', () => {
    simulerLargeurEcran(true)
    renderTable([
      holding({ id: 1, ticker: 'AAA', valeur: 150000, quotite_pct: 50, valeur_ligne: 300000 }),
      holding({ id: 2, ticker: 'BBB', valeur: 25000, quotite_pct: 25, valeur_ligne: 100000 }),
    ])

    expect(screen.getByText((_, el) => el?.tagName === 'P' && normaliser(el.textContent) === '2 positions · 175 000,00 €')).toBeInTheDocument()
  })
})
