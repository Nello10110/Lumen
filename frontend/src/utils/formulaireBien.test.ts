import { describe, expect, it } from 'vitest'
import type { HoldingDetail } from '../api/types'
import { LOAN_FORM_VIDE } from '../components/LoanFormFields'
import {
  FORM_BIEN_VIDE,
  bienInputDepuis,
  champsRevenus,
  estimerNotaire,
  formDepuisDetail,
  immobilierInputDepuis,
  usageDepuis,
  validerLeBien,
  validerPret,
  validerRevenus,
  type FormBien,
  type FormPret,
} from './formulaireBien'

const form = (surcharges: Partial<FormBien> = {}): FormBien => ({ ...FORM_BIEN_VIDE, nom: 'Maison', prix_achat: '200000', ...surcharges })
const sansPret: FormPret = { mode: 'aucun', nouveau: LOAN_FORM_VIDE, existantId: '' }

describe('validerLeBien', () => {
  it('exige un nom et un prix d’achat strictement positif', () => {
    expect(validerLeBien(form())).toEqual({})
    expect(Object.keys(validerLeBien(form({ nom: '  ', prix_achat: '' })))).toEqual(['nom', 'prix_achat'])
    expect(validerLeBien(form({ prix_achat: '0' })).prix_achat).toMatch(/supérieur à 0/)
  })

  it('refuse une date d’achat dans le futur, des frais négatifs et une surface nulle', () => {
    const erreurs = validerLeBien(form({ date_achat: '2999-01-01', frais_notaire: '-5', surface_m2: '0' }))

    expect(Object.keys(erreurs).sort()).toEqual(['date_achat', 'frais_notaire', 'surface_m2'])
  })

  it('accepte les champs facultatifs vides', () => {
    expect(validerLeBien(form({ frais_notaire: '', valeur_estimee: '', surface_m2: '', date_achat: '' }))).toEqual({})
  })
})

describe('validerRevenus', () => {
  it('un bien locatif exige un loyer, 0 admis', () => {
    expect(validerRevenus(form({ usage: 'locatif' })).loyer_mensuel).toBeDefined()
    expect(validerRevenus(form({ usage: 'locatif', loyer_mensuel: '0' }))).toEqual({})
  })

  it('ignore les revenus qui ne s’appliquent pas au type de bien', () => {
    expect(validerRevenus(form({ usage: 'autre', loyer_mensuel: '-3', charges_mensuelles: 'x' }))).toEqual({})
    expect(champsRevenus('autre')).toEqual([])
    expect(champsRevenus('residence_principale')).toEqual(['charges_mensuelles', 'simulation_loyer_estime', 'simulation_taxe_habitation_annuelle'])
  })
})

describe('validerPret', () => {
  it('sans prêt, rien à valider', () => {
    expect(validerPret(sansPret)).toEqual({})
  })

  it('un nouveau prêt exige chacun de ses six champs', () => {
    expect(Object.keys(validerPret({ ...sansPret, mode: 'nouveau' })).sort()).toEqual([
      'pret_capital_initial',
      'pret_date_debut',
      'pret_duree_mois',
      'pret_libelle',
      'pret_mensualite',
      'pret_taux_annuel_pct',
    ])
  })

  it('une durée doit être un nombre entier de mois', () => {
    const nouveau = { libelle: 'C', capital_initial: '1', taux_annuel_pct: '0', mensualite: '1', date_debut: '2024-01-01', duree_mois: '12.5' }

    expect(validerPret({ ...sansPret, mode: 'nouveau', nouveau }).pret_duree_mois).toBeDefined()
  })

  it('un prêt existant doit être choisi', () => {
    expect(validerPret({ ...sansPret, mode: 'existant' }).pret_existant).toBeDefined()
    expect(validerPret({ ...sansPret, mode: 'existant', existantId: '5' })).toEqual({})
  })
})

describe('bienInputDepuis', () => {
  it('n’envoie que les revenus du type de bien', () => {
    const f = form({ usage: 'residence_principale', loyer_mensuel: '900', charges_mensuelles: '120', frais_annuels: '500', simulation_loyer_estime: '1100' })

    const input = bienInputDepuis(f, sansPret, [])

    expect(input).toMatchObject({ loyer_mensuel: null, frais_annuels: null, charges_mensuelles: 120, simulation_loyer_estime: 1100 })
  })

  it('traduit les champs vides en null et la zone « par défaut » en null', () => {
    const input = bienInputDepuis(form({ zone_geo: '' }), sansPret, [])

    expect(input).toMatchObject({ nom: 'Maison', prix_achat: 200000, valeur_estimee: null, date_achat: null, zone_geo: null, pret: null, pret_existant_id: null })
  })
})

describe('estimerNotaire', () => {
  it('7,5 % du prix, arrondi à l’euro', () => {
    expect(estimerNotaire(250000)).toBe(18750)
    expect(estimerNotaire(123456)).toBe(9259)
  })
})

describe('usageDepuis et formDepuisDetail', () => {
  const immobilier = (surcharges: Partial<NonNullable<HoldingDetail['immobilier']>> = {}) =>
    ({
      loyer_mensuel: null,
      charges_mensuelles: null,
      frais_annuels: null,
      frais_notaire: null,
      frais_travaux: null,
      frais_acquisition_autres: null,
      surface_m2: null,
      residence_principale: false,
      simulation_loyer_estime: null,
      simulation_taxe_habitation_annuelle: null,
      cashflow_mensuel: null,
      rentabilite_brute_pct: null,
      rentabilite_nette_pct: null,
      prix_m2: null,
      emprunt_mensualite: null,
      prix_acquisition_total: null,
      ...surcharges,
    }) as NonNullable<HoldingDetail['immobilier']>

  it('la résidence principale est stockée ; locatif et autre se déduisent du loyer', () => {
    expect(usageDepuis(immobilier({ residence_principale: true, loyer_mensuel: 500 }))).toBe('residence_principale')
    expect(usageDepuis(immobilier({ loyer_mensuel: 0 }))).toBe('locatif')
    expect(usageDepuis(immobilier({ loyer_mensuel: 900 }))).toBe('locatif')
    expect(usageDepuis(immobilier())).toBe('autre')
    expect(usageDepuis(null)).toBe('autre')
  })

  it('immobilierInputDepuis reprend les champs du bien et les revenus, selon le type', () => {
    const bien = form({ usage: 'locatif', frais_notaire: '1000', surface_m2: '45' })
    const revenus = form({ usage: 'locatif', loyer_mensuel: '700', charges_mensuelles: '50', simulation_loyer_estime: '999' })

    expect(immobilierInputDepuis(bien, revenus)).toEqual({
      frais_notaire: 1000,
      frais_travaux: null,
      frais_acquisition_autres: null,
      surface_m2: 45,
      residence_principale: false,
      loyer_mensuel: 700,
      charges_mensuelles: 50,
      frais_annuels: null,
      simulation_loyer_estime: null,
      simulation_taxe_habitation_annuelle: null,
    })
  })

  it('formDepuisDetail relit une fiche : valeurs en chaînes, date tronquée au jour', () => {
    const detail = {
      nom: 'Appartement',
      prix_revient_moyen: 250000,
      valeur_estimee: 270000,
      date_acquisition: '2021-06-15T00:00:00',
      zone_geo: null,
    } as HoldingDetail

    const f = formDepuisDetail(detail, immobilier({ loyer_mensuel: 800, surface_m2: 52.5 }))

    expect(f).toMatchObject({ usage: 'locatif', nom: 'Appartement', prix_achat: '250000', valeur_estimee: '270000', date_achat: '2021-06-15', loyer_mensuel: '800', surface_m2: '52.5' })
  })
})
