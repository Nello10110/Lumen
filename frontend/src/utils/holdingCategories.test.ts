import { describe, expect, it } from 'vitest'
import type { Holding } from '../api/types'
import {
  categorieDe,
  identifiantEstTechnique,
  libelleTaux,
  TYPES_AVEC_TAUX,
  TYPES_COTES,
  valeurProjeteeUnAn,
} from './holdingCategories'

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 1,
    ticker: 'AAA',
    nom: null,
    quantite: 1,
    prix_revient_moyen: 100,
    cout_acquisition_total: 100,
    compte: null,
    type_actif: 'STOCK',
    origine: 'reconstruit',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    market_data: null,
    rendement_depuis_achat_pct: null,
    rendement_annualise_pct: null,
    valeur: 100,
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

describe('valeurProjeteeUnAn (backlog 2.M.1)', () => {
  it('applique le taux positif (épargne) à la valeur estimée', () => {
    expect(valeurProjeteeUnAn(10000, 3)).toBeCloseTo(10300)
  })

  it('renvoie null si la valeur estimée ou le taux est absent', () => {
    expect(valeurProjeteeUnAn(null, 3)).toBeNull()
    expect(valeurProjeteeUnAn(10000, null)).toBeNull()
    expect(valeurProjeteeUnAn(null, null)).toBeNull()
  })
})

describe('taux annuel (backlog 2.M.1, § BN.1)', () => {
  it("s'appelle « Taux d'intérêt annuel »", () => {
    expect(libelleTaux()).toBe("Taux d'intérêt annuel (%)")
  })

  it("ne concerne plus que l'épargne : la décote d'un véhicule n'est plus saisie", () => {
    expect([...TYPES_AVEC_TAUX].sort()).toEqual(['EMPLOYEE_SAVINGS', 'REGULATED_SAVINGS'])
    expect(TYPES_AVEC_TAUX.has('VEHICLE')).toBe(false)
  })
})

describe('TYPES_COTES (§ BN.1)', () => {
  it("réunit les titres dont le cours vient du marché, jamais un bien saisi à la main", () => {
    expect([...TYPES_COTES].sort()).toEqual(['BOND', 'CRYPTO', 'FUND', 'PRIVATE_FUND', 'STOCK'])
    expect(TYPES_COTES.has('REAL_ESTATE')).toBe(false)
  })
})

describe('identifiantEstTechnique (§ BN.1)', () => {
  it('reconnaît un bien saisi à la main, dont seul le nom parle', () => {
    expect(identifiantEstTechnique({ type_actif: 'REAL_ESTATE', nom: 'Appartement Lyon' })).toBe(true)
    expect(identifiantEstTechnique({ type_actif: 'REGULATED_SAVINGS', nom: 'Livret A' })).toBe(true)
  })

  it("garde l'identifiant d'une ligne sans nom : c'est la seule façon de la reconnaître", () => {
    expect(identifiantEstTechnique({ type_actif: 'REAL_ESTATE', nom: null })).toBe(false)
    expect(identifiantEstTechnique({ type_actif: 'REAL_ESTATE', nom: '  ' })).toBe(false)
  })

  it("garde le ticker d'un titre coté, même nommé, et d'une ligne sans type", () => {
    expect(identifiantEstTechnique({ type_actif: 'STOCK', nom: 'Apple' })).toBe(false)
    expect(identifiantEstTechnique({ type_actif: null, nom: 'Apple' })).toBe(false)
  })
})

describe('categorieDe (backlog AO.1)', () => {
  it('classe une ligne Bricks.co sous "Immobilier & Épargne", pas "Obligations"', () => {
    // Retour utilisateur du 17/09/2026 : « ce sont des investissements immobilier
    // aussi » — même si `type_actif` reste `BOND` (préserve le grand livre de
    // transactions/XIRR réel de ces lignes côté backend, cf.
    // `patrimoine_service.label_type_actif`), l'onglet du Portefeuille doit
    // regrouper Bricks.co avec l'immobilier, pas avec les obligations classiques.
    expect(categorieDe(holding({ ticker: 'BRICKS-ABCDEF0123', type_actif: 'BOND' }))).toBe('PATRIMOINE')
  })

  it('laisse une obligation classique (Trade Republic) sous "Obligations"', () => {
    expect(categorieDe(holding({ ticker: 'FR0000120271', type_actif: 'BOND' }))).toBe('BOND')
  })

  it('laisse les autres catégories inchangées', () => {
    expect(categorieDe(holding({ ticker: 'AAPL', type_actif: 'STOCK' }))).toBe('STOCK')
    expect(categorieDe(holding({ ticker: 'MAISON', type_actif: 'REAL_ESTATE' }))).toBe('PATRIMOINE')
    expect(categorieDe(holding({ ticker: 'INCONNU', type_actif: null }))).toBe('AUTRES')
  })
})
