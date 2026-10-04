import { describe, expect, it } from 'vitest'
import {
  borner,
  correctifProposable,
  depuisQuotites,
  ecartAvecCent,
  formaterPart,
  nombreSaisi,
  partsEgales,
  quotitesDepuis,
  repartitionEnCours,
  repartitionParDefaut,
  toutPour,
  totalRepartition,
  totalValide,
} from './repartitionMembres'

describe('partsEgales', () => {
  it('un seul membre a 100 %', () => {
    expect(partsEgales([7])).toEqual({ 7: '100' })
    expect(repartitionParDefaut([7])).toEqual({ 7: '100' })
  })

  it('deux membres se partagent 50 / 50', () => {
    expect(partsEgales([1, 2])).toEqual({ 1: '50', 2: '50' })
  })

  it("l'arrondi est absorbé par le DERNIER membre : la somme fait toujours exactement 100", () => {
    expect(partsEgales([1, 2, 3])).toEqual({ 1: '33.33', 2: '33.33', 3: '33.34' })
    const sept = partsEgales([1, 2, 3, 4, 5, 6, 7])
    expect(Object.values(sept)).toEqual(['14.28', '14.28', '14.28', '14.28', '14.28', '14.28', '14.32'])
    expect(totalRepartition(sept, [1, 2, 3, 4, 5, 6, 7])).toBeCloseTo(100, 10)
  })

  it('aucun membre : rien', () => {
    expect(partsEgales([])).toEqual({})
  })
})

describe('toutPour', () => {
  it('donne 100 % à un membre et 0 aux autres', () => {
    expect(toutPour(2, [1, 2, 3])).toEqual({ 1: '0', 2: '100', 3: '0' })
  })
})

describe('total et validité', () => {
  const ids = [1, 2]

  it('somme les parts saisies, virgule tolérée, cellule vide ou illisible = 0', () => {
    expect(totalRepartition({ 1: '33,5', 2: '' }, ids)).toBe(33.5)
    expect(totalRepartition({ 1: 'abc', 2: '10' }, ids)).toBe(10)
  })

  it('une répartition à zéro partout est valide : « ne pas répartir »', () => {
    expect(repartitionEnCours({}, ids)).toBe(false)
    expect(totalValide({}, ids)).toBe(true)
    expect(totalValide({ 1: '0', 2: '0' }, ids)).toBe(true)
  })

  it('exige 100 %, à la tolérance du serveur près', () => {
    expect(totalValide({ 1: '60', 2: '40' }, ids)).toBe(true)
    expect(totalValide({ 1: '60', 2: '40.005' }, ids)).toBe(true)
    expect(totalValide({ 1: '60', 2: '39' }, ids)).toBe(false)
    expect(totalValide({ 1: '60', 2: '41' }, ids)).toBe(false)
  })

  it("l'écart n'expose jamais de bruit de flottant", () => {
    expect(ecartAvecCent({ 1: '33.3', 2: '33.3' }, ids)).toBe(33.4)
  })
})

describe('correctifProposable — le message actionnable', () => {
  const ids = [1, 2, 3]

  it("quand il manque, propose de l'ajouter au membre qui en a le moins", () => {
    const correctif = correctifProposable({ 1: '50', 2: '30', 3: '10' }, ids)

    expect(correctif).toEqual({ id: 3, apres: '20', ecart: 10 })
  })

  it("en cas d'égalité, retient le dernier membre", () => {
    expect(correctifProposable({ 1: '40', 2: '40', 3: '10' }, ids)?.id).toBe(3)
    expect(correctifProposable({ 1: '0', 2: '0', 3: '0' }, ids)?.id).toBe(3)
  })

  it("quand il y en a trop, propose de les retirer à celui qui en a le plus", () => {
    const correctif = correctifProposable({ 1: '70', 2: '30', 3: '10' }, ids)

    expect(correctif).toEqual({ id: 1, apres: '60', ecart: -10 })
  })

  it("ne propose rien si le plus gros ne peut pas absorber l'excédent à lui seul", () => {
    // 4 × 40 = 160 : il y a 60 de trop, et personne n'a 60 à rendre.
    expect(correctifProposable({ 1: '40', 2: '40', 3: '40', 4: '40' }, [1, 2, 3, 4])).toBeNull()
  })

  it('ne propose rien quand le total est bon', () => {
    expect(correctifProposable({ 1: '50', 2: '50' }, [1, 2])).toBeNull()
    expect(correctifProposable({}, [])).toBeNull()
  })
})

describe('quotitesDepuis', () => {
  it("n'envoie que les parts strictement positives, dans l'ordre des membres", () => {
    expect(quotitesDepuis({ 1: '60', 2: '0', 3: '40' }, [1, 2, 3])).toEqual([
      { detenteur_id: 1, quotite_pct: 60 },
      { detenteur_id: 3, quotite_pct: 40 },
    ])
  })
})

describe('depuisQuotites / formaterPart / borner / nombreSaisi', () => {
  it('reprend des quotités du serveur sous forme de chaînes propres', () => {
    expect(depuisQuotites([{ detenteur_id: 1, quotite_pct: 33.33 }, { detenteur_id: 2, quotite_pct: 66.67 }])).toEqual({ 1: '33.33', 2: '66.67' })
    expect(formaterPart(0.1 + 0.2)).toBe('0.3')
  })

  it('borne une part entre 0 et 100', () => {
    expect(borner(-5)).toBe(0)
    expect(borner(120)).toBe(100)
    expect(borner(42)).toBe(42)
  })

  it("lit une part saisie, vide ou absente comme 0", () => {
    expect(nombreSaisi(undefined)).toBe(0)
    expect(nombreSaisi('')).toBe(0)
    expect(nombreSaisi('12,5')).toBe(12.5)
  })
})
