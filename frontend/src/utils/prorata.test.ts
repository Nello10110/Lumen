import { describe, expect, it } from 'vitest'
import type { Compte, Detenteur } from '../api/types'
import { facteurPart, libelleCompteComplet, nomsDesMembres } from './prorata'

function membre(id: number, nom: string): Detenteur {
  return { id, nom, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' }
}

function compte(overrides: Partial<Compte> = {}): Compte {
  return { id: 1, nom: 'PEA', etablissement: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00', ...overrides }
}

const ALICE = membre(1, 'Alice')
const BOB = membre(2, 'Bob')
const CLARA = membre(3, 'Clara')

describe('facteurPart', () => {
  it("vaut 1 hors vue d'un membre (quotite_pct absent ou null) : aucun montant n'est réduit", () => {
    expect(facteurPart({})).toBe(1)
    expect(facteurPart({ quotite_pct: null })).toBe(1)
  })

  it('transforme le pourcentage en facteur : 50 => 0,5 et 33,33 => 0,3333', () => {
    expect(facteurPart({ quotite_pct: 50 })).toBe(0.5)
    expect(facteurPart({ quotite_pct: 33.33 })).toBeCloseTo(0.3333, 4)
  })

  it("distingue une part à 0 % (facteur 0) d'une part absente (facteur 1)", () => {
    expect(facteurPart({ quotite_pct: 0 })).toBe(0)
  })
})

describe('nomsDesMembres', () => {
  it("liste les noms dans l'ordre des membres du foyer, pas dans celui des identifiants fournis", () => {
    expect(nomsDesMembres([3, 1], [ALICE, BOB, CLARA])).toBe('Alice, Clara')
  })

  it("ignore les identifiants qui ne sont plus des membres, et rend une chaîne vide s'il n'en reste aucun", () => {
    expect(nomsDesMembres([2, 99], [ALICE, BOB])).toBe('Bob')
    expect(nomsDesMembres([99], [ALICE, BOB])).toBe('')
  })
})

describe('libelleCompteComplet', () => {
  const etab = { id: 7, nom: 'Boursorama', logo_key: null, a_un_logo: false, logo_source: null, logo_maj_le: null, created_at: '', updated_at: '' }

  it('dit « Compte · Établissement · membres » à partir de deux membres dans le foyer', () => {
    const c = compte({ nom: 'PEA', etablissement: etab, membres_ids: [1, 2] })
    expect(libelleCompteComplet(c, [ALICE, BOB])).toBe('PEA · Boursorama · Alice, Bob')
  })

  it('ne dit PAS les membres avec un seul membre dans le foyer : ce serait du bruit', () => {
    const c = compte({ nom: 'PEA', etablissement: etab, membres_ids: [1] })
    expect(libelleCompteComplet(c, [ALICE])).toBe('PEA · Boursorama')
  })

  it("n'ajoute rien pour un compte sans membres_ids (absent ou vide) ni sans établissement", () => {
    expect(libelleCompteComplet(compte({ nom: 'Livret' }), [ALICE, BOB])).toBe('Livret')
    expect(libelleCompteComplet(compte({ nom: 'Livret', membres_ids: [] }), [ALICE, BOB])).toBe('Livret')
  })
})
