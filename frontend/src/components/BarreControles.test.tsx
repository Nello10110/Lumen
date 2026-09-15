import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur } from '../api/types'
import { PreferencesAffichageProvider } from '../contexts/PreferencesAffichageContext'
import BarreControles from './BarreControles'

// Détenteurs (backlog 2.L.1) : `BarreControles` charge la liste au montage pour son
// sélecteur "Détenteur", masqué tant qu'aucun n'est déclaré.
vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn().mockResolvedValue([]),
  },
}))

function detenteur(overrides: Partial<Detenteur> = {}): Detenteur {
  return { id: 1, nom: 'Alice', type: 'personne', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00', ...overrides }
}

// `MemoryRouter` conservé même si la barre ne lit plus la route depuis le retrait de
// la pilule de contexte (07/09/2026) : ses enfants restent susceptibles d'en avoir
// besoin, et le harnais ne coûte rien.
function renderBarre() {
  return render(
    <MemoryRouter>
      <PreferencesAffichageProvider>
        <BarreControles />
      </PreferencesAffichageProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(api.listDetenteurs).mockResolvedValue([])
})

describe('BarreControles (backlog 2.K.3)', () => {
  it('affiche les 3 boutons de lentille, "Net" actif par défaut', () => {
    renderBarre()
    expect(screen.getByRole('button', { name: 'Net' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Brut' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Financier' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('cliquer sur "Brut" change la lentille active et persiste le choix', () => {
    renderBarre()
    fireEvent.click(screen.getByRole('button', { name: 'Brut' }))

    expect(screen.getByRole('button', { name: 'Brut' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Net' })).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem('patrimoine:lentille')).toBe('brut')
  })

  it('le bouton œil bascule le masquage des montants', () => {
    renderBarre()
    const bouton = screen.getByRole('button', { name: /Masquer les montants/ })
    expect(bouton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(bouton)

    expect(screen.getByRole('button', { name: /Afficher les montants/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('BarreControles — filtre détenteur (backlog 2.L.1)', () => {
  it("n'affiche aucun sélecteur Détenteur si l'utilisateur n'a déclaré personne", async () => {
    renderBarre()
    await vi.waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    expect(screen.queryByText('Détenteur')).not.toBeInTheDocument()
  })

  it('affiche "Foyer" + chaque détenteur déclaré, "Foyer" sélectionné par défaut', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' }), detenteur({ id: 2, nom: 'Bob' })])
    renderBarre()

    await screen.findByText('Détenteur')
    const select = screen.getAllByRole('combobox')[0]
    expect(select).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Foyer' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument()
  })

  it('choisir un détenteur persiste son id dans localStorage', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ id: 7, nom: 'Alice' })])
    renderBarre()
    await screen.findByText('Détenteur')

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '7' } })

    expect(localStorage.getItem('patrimoine:detenteur-id')).toBe('7')
  })
})

describe('BarreControles — Période retirée (refonte « liquid glass », étape 4)', () => {
  // La période vit désormais à côté de la courbe qu'elle change
  // (`PortfolioHistoryChart`), plus dans cette barre : un sélecteur global qui
  // pilotait certains écrans et pas d'autres était l'incohérence à supprimer.
  it("n'affiche plus de sélecteur de période", () => {
    renderBarre()

    expect(screen.queryByText('Période')).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Personnalisée…' })).not.toBeInTheDocument()
  })
})

describe('BarreControles — micro-interaction sur la bascule de thème (backlog § AF.2)', () => {
  // Correctif du 16/09/2026 : l'animation n'était posée que sur `BasculeTheme.tsx`
  // (menu « Plus » mobile), jamais sur CETTE barre — le seul sélecteur de thème
  // visible en desktop, restée à une icône figée sans que rien ne le signale (une
  // classe CSS peut très bien être vérifiée par un test sans que la règle
  // correspondante existe, ni que le bon composant la porte). Vérifie ici les deux
  // à la fois : que l'icône qui VIENT de devenir active porte la classe, et
  // qu'aucune des deux autres ne la porte jamais.
  it("seule l'icône du thème qui vient d'être choisi porte la classe d'animation", () => {
    renderBarre()
    const clair = screen.getByRole('button', { name: 'Thème clair' })
    const eclipse = screen.getByRole('button', { name: 'Éclipse (thème sombre)' })
    const systeme = screen.getByRole('button', { name: 'Suivre le système' })

    // Thème par défaut ('systeme') : aucune icône ne vient de changer, donc aucune
    // n'est animée — l'animation marque un CHANGEMENT, pas un état.
    expect(clair.querySelector('svg')?.getAttribute('class')).not.toContain('animate-lumen-bascule-theme')

    fireEvent.click(eclipse)

    expect(eclipse.querySelector('svg')?.getAttribute('class')).toContain('animate-lumen-bascule-theme')
    expect(clair.querySelector('svg')?.getAttribute('class')).not.toContain('animate-lumen-bascule-theme')
    expect(systeme.querySelector('svg')?.getAttribute('class')).not.toContain('animate-lumen-bascule-theme')
  })
})

describe('BarreControles — pilule de contexte retirée (07/09/2026)', () => {
  // Retour utilisateur : « on a le nom de la page qui est rappelée, je ne vois pas
  // l'intérêt ». L'item actif de la barre latérale et le titre de la page le disent
  // déjà — et la barre doit tenir sur une seule ligne.
  it("ne rappelle plus le nom de l'écran courant", () => {
    renderBarre()

    expect(screen.queryByText('Synthèse')).not.toBeInTheDocument()
  })

  // L'ask explicite : la bascule prend le gabarit de pilule du reste de la barre.
  it('la bascule des montants est une pilule, active quand les montants sont masqués', () => {
    renderBarre()
    const pilule = screen.getByRole('button', { name: 'Masquer les montants' })

    expect(pilule.className).toContain('rounded-chip')
    expect(pilule.className).toContain('border')

    fireEvent.click(pilule)
    expect(screen.getByRole('button', { name: 'Afficher les montants' }).className).toContain('bg-accent-soft')
  })
})
