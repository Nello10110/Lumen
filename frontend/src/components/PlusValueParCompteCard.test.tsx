import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Compte, Holding, MarketData } from '../api/types'
import PlusValueParCompteCard from './PlusValueParCompteCard'

// Graphique recharts mis de côté (même doctrine que `AllocationChartCard.test.tsx`) :
// ce fichier verrouille le calcul affiché (tableau, masquage, état vide), pas le
// rendu recharts lui-même (`ResponsiveContainer` mesure à 0 en environnement headless).

function compte(overrides: Partial<Compte> = {}): Compte {
  return { id: 1, nom: 'PEA', etablissement: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00', ...overrides }
}

function marketData(overrides: Partial<MarketData> = {}): MarketData {
  return {
    ticker: 'AAA',
    nom: null,
    prix_actuel: 1,
    devise: 'EUR',
    secteur: null,
    pays: null,
    region: null,
    erreur: null,
    derniere_maj: '2026-01-01T00:00:00',
    ...overrides,
  }
}

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 1,
    ticker: 'AAA',
    nom: null,
    quantite: 1,
    prix_revient_moyen: null,
    // En l'absence de frais d'acquisition (hors sujet de ce fichier), même valeur
    // que `prix_revient_moyen` par défaut — sauf si le test le précise explicitement.
    cout_acquisition_total: overrides.prix_revient_moyen ?? null,
    compte: null,
    devise: null,
    type_actif: 'STOCK',
    origine: 'reconstruit',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    // Une cotation par défaut : ce fichier teste le cas ORDINAIRE (plus-value
    // mesurable). Le cas Bricks.co (aucune cotation, `gain` affiché « — », retour
    // utilisateur du 14/09/2026) a son propre test plus bas, `market_data: null`
    // posé explicitement.
    market_data: marketData(),
    rendement_depuis_achat_pct: null,
    rendement_annualise_pct: null,
    valeur: 0,
    valeur_estimee: null,
    date_valeur_estimee: null,
    taux_pct: null,
    zone_geo: null,
    versement_mensuel: null,
    date_acquisition: null,
    ...overrides,
  }
}

describe('PlusValueParCompteCard', () => {
  it("affiche un état vide quand aucune ligne n'a de prix de revient connu", () => {
    render(<PlusValueParCompteCard holdings={[holding({ prix_revient_moyen: null })]} montantsMasques={false} />)

    expect(screen.getByText('Rien à comparer pour l\'instant.')).toBeInTheDocument()
  })

  it('liste chaque compte avec sa plus-value en euros et en pourcentage', () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    render(
      <PlusValueParCompteCard
        holdings={[holding({ compte: pea, quantite: 10, prix_revient_moyen: 100, valeur: 1200 })]}
        montantsMasques={false}
      />,
    )

    const ligne = screen.getByText('PEA').closest('tr')!
    expect(ligne).toHaveTextContent('1 200 €')
    expect(ligne).toHaveTextContent('+200 €(+20.0%)')
  })

  it('affiche "—" pour le rendement annualisé quand aucune ligne du compte ne le connaît', () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    render(
      <PlusValueParCompteCard
        holdings={[holding({ compte: pea, quantite: 1, prix_revient_moyen: 100, valeur: 90, rendement_annualise_pct: null })]}
        montantsMasques={false}
      />,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('masque les montants quand montantsMasques est actif', () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    render(
      <PlusValueParCompteCard
        holdings={[holding({ compte: pea, quantite: 1, prix_revient_moyen: 100, valeur: 120 })]}
        montantsMasques={true}
      />,
    )

    expect(screen.queryByText('120 €')).not.toBeInTheDocument()
    expect(screen.getAllByText('••••••').length).toBeGreaterThan(0)
  })

  it('affiche une ligne par compte, triée par plus-value décroissante', () => {
    const gagnant = compte({ id: 1, nom: 'Compte gagnant' })
    const perdant = compte({ id: 2, nom: 'Compte perdant' })
    render(
      <PlusValueParCompteCard
        holdings={[
          holding({ ticker: 'AAA', compte: perdant, quantite: 1, prix_revient_moyen: 100, valeur: 50 }),
          holding({ ticker: 'BBB', compte: gagnant, quantite: 1, prix_revient_moyen: 100, valeur: 150 }),
        ]}
        montantsMasques={false}
      />,
    )

    const lignes = screen.getAllByRole('row').slice(1) // ignore la ligne d'en-tête
    expect(lignes[0]).toHaveTextContent('Compte gagnant')
    expect(lignes[1]).toHaveTextContent('Compte perdant')
  })

  it("affiche « — » pour la plus-value d'un compte valorisé au coût, jamais « +0 € » (retour utilisateur du 14/09/2026, Bricks.co)", () => {
    const bricksCo = compte({ id: 1, nom: 'Bricks.co' })
    render(
      <PlusValueParCompteCard
        holdings={[
          holding({ ticker: 'BRICKS-ABC', compte: bricksCo, quantite: 10, prix_revient_moyen: 100, valeur: 1000, market_data: null }),
        ]}
        montantsMasques={false}
      />,
    )

    const ligne = screen.getByText('Bricks.co').closest('tr')!
    // Le total reste affiché (1 000 €, la meilleure estimation disponible) ; seule
    // la plus-value — une comparaison à un prix qu'on ne connaît pas — est absente.
    expect(ligne).toHaveTextContent('1 000 €')
    expect(ligne).not.toHaveTextContent('+0 €')
    expect(ligne.textContent).toMatch(/—/)
  })
})
