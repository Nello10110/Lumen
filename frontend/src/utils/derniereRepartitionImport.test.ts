import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Detenteur } from '../api/types'
import { dernierChoixImportExiste, memoriserRepartitionImport, repartitionInitialeImport } from './derniereRepartitionImport'

function membre(id: number, nom: string): Detenteur {
  return { id, nom, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' }
}

const ALICE = membre(1, 'Alice')
const BOB = membre(2, 'Bob')
const MEMBRES = [ALICE, BOB]

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('repartitionInitialeImport — dernier choix mémorisé PAR FOYER (§ BN.1, lot 3)', () => {
  it('sans choix mémorisé : parts égales entre les membres', () => {
    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '50', 2: '50' })
  })

  it('reprend le dernier choix mémorisé du foyer', () => {
    memoriserRepartitionImport(1, [{ detenteur_id: 1, quotite_pct: 70 }, { detenteur_id: 2, quotite_pct: 30 }])

    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '70', 2: '30' })
  })

  it('un choix « 100 % Alice » (Bob absent du choix) se relit avec Bob à 0', () => {
    memoriserRepartitionImport(1, [{ detenteur_id: 1, quotite_pct: 100 }])

    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '100', 2: '0' })
  })

  it("la clé est PAR FOYER : le choix du foyer 1 n'est jamais lu pour le foyer 2", () => {
    memoriserRepartitionImport(1, [{ detenteur_id: 1, quotite_pct: 100 }])

    expect(repartitionInitialeImport(2, MEMBRES)).toEqual({ 1: '50', 2: '50' })
    expect(dernierChoixImportExiste(2)).toBe(false)
    expect(dernierChoixImportExiste(1)).toBe(true)
  })

  it('mémoriser pour le foyer 2 ne touche pas au choix du foyer 1', () => {
    memoriserRepartitionImport(1, [{ detenteur_id: 1, quotite_pct: 100 }])
    memoriserRepartitionImport(2, [{ detenteur_id: 2, quotite_pct: 100 }])

    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '100', 2: '0' })
    expect(repartitionInitialeImport(2, MEMBRES)).toEqual({ 1: '0', 2: '100' })
  })

  it('un membre supprimé depuis ne ressuscite pas : le choix qui le cite est ignoré, parts égales', () => {
    memoriserRepartitionImport(1, [{ detenteur_id: 1, quotite_pct: 50 }, { detenteur_id: 3, quotite_pct: 50 }])

    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '50', 2: '50' })
  })

  it('un choix dont la somme ne fait pas 100 % est ignoré : parts égales', () => {
    memoriserRepartitionImport(1, [{ detenteur_id: 1, quotite_pct: 60 }, { detenteur_id: 2, quotite_pct: 20 }])

    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '50', 2: '50' })
  })

  it('un contenu illisible, vide ou de mauvaise forme est ignoré : parts égales', () => {
    localStorage.setItem('lumen:repartition-import:1', 'pas du json')
    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '50', 2: '50' })

    localStorage.setItem('lumen:repartition-import:1', '[]')
    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '50', 2: '50' })

    localStorage.setItem('lumen:repartition-import:1', '{"detenteur_id":1}')
    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '50', 2: '50' })
  })

  it("stockage indisponible : parts égales, sans lever d'erreur", () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('stockage bloqué')
    })

    expect(repartitionInitialeImport(1, MEMBRES)).toEqual({ 1: '50', 2: '50' })
    expect(dernierChoixImportExiste(1)).toBe(false)
  })

  it("mémoriser avec un stockage indisponible ne lève pas d'erreur : l'import ne doit jamais échouer pour ça", () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota dépassé')
    })

    expect(() => memoriserRepartitionImport(1, [{ detenteur_id: 1, quotite_pct: 100 }])).not.toThrow()
  })

  it('foyer inconnu (null) : une clé « sans-foyer » distincte de tout foyer réel', () => {
    memoriserRepartitionImport(null, [{ detenteur_id: 1, quotite_pct: 100 }])

    expect(repartitionInitialeImport(null, MEMBRES)).toEqual({ 1: '100', 2: '0' })
    expect(dernierChoixImportExiste(1)).toBe(false)
  })
})
