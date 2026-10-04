import { describe, expect, it } from 'vitest'
import {
  aujourdhuiIso,
  arrondi2,
  capitalRestantDu,
  indicateursLocatifs,
  lireNombre,
  moisEcoules,
  partsMembres,
} from './apercuImmobilier'
import vecteurs from './vecteursApercuImmobilier.json'

/** Parité avec le serveur (§ BN.1, lot 2) : `vecteursApercuImmobilier.json` est lu aussi par
 * pytest (`tests/test_vecteurs_apercu_immobilier.py`), qui vérifie que le SERVEUR redonne ces
 * valeurs. Ce fichier-ci vérifie que l'aperçu en direct les redonne aussi : si les deux passent,
 * l'aperçu affiche ce que le serveur calculera. Une formule modifiée d'un seul côté fait
 * échouer l'un des deux. */
describe('aperçu en direct — parité avec le serveur (vecteurs partagés)', () => {
  it.each(vecteurs.indicateurs)('indicateurs : $nom', ({ entree, attendu }) => {
    const calcule = indicateursLocatifs({
      prixAchat: entree.prix_achat,
      fraisNotaire: entree.frais_notaire,
      fraisTravaux: entree.frais_travaux,
      fraisAcquisitionAutres: entree.frais_acquisition_autres,
      valeur: entree.valeur,
      surfaceM2: entree.surface_m2,
      loyerMensuel: entree.loyer_mensuel,
      chargesMensuelles: entree.charges_mensuelles,
      fraisAnnuels: entree.frais_annuels,
      mensualitePret: entree.mensualite_pret,
    })

    expect(calcule).toEqual(attendu)
  })

  it.each(vecteurs.capital_restant_du)('capital restant dû : $nom', ({ pret, a_la_date, attendu }) => {
    const calcule = capitalRestantDu(
      {
        capitalInitial: pret.capital_initial,
        tauxAnnuelPct: pret.taux_annuel_pct,
        mensualite: pret.mensualite,
        dateDebut: pret.date_debut,
        dureeMois: pret.duree_mois,
      },
      a_la_date,
    )

    expect(arrondi2(calcule)).toBe(attendu)
  })

  it.each(vecteurs.parts)('parts : $nom', ({ valeur, capital_restant_du_total, quotites, attendu }) => {
    const calcule = partsMembres(
      valeur,
      capital_restant_du_total ?? 0,
      quotites.map((q) => ({ detenteurId: q.detenteur_id, quotitePct: q.quotite_pct })),
    )

    expect(calcule).toEqual(Object.fromEntries(Object.entries(attendu).map(([id, part]) => [Number(id), part])))
  })

  it('le fichier de vecteurs couvre bien chaque famille de calcul', () => {
    expect(vecteurs.indicateurs.length).toBeGreaterThanOrEqual(8)
    expect(vecteurs.capital_restant_du.length).toBeGreaterThanOrEqual(6)
    expect(vecteurs.parts.length).toBeGreaterThanOrEqual(4)
  })
})

describe('arrondi2', () => {
  it('arrondit au demi supérieur, loin de zéro, comme Decimal côté serveur', () => {
    expect(arrondi2(1.005)).toBe(1.01)
    expect(arrondi2(2.675)).toBe(2.68)
    expect(arrondi2(-2.675)).toBe(-2.68)
    expect(arrondi2(0.125)).toBe(0.13)
    expect(arrondi2(10)).toBe(10)
  })
})

describe('lireNombre', () => {
  it('lit un nombre saisi, virgule tolérée ; vide ou illisible donne null', () => {
    expect(lireNombre('12,5')).toBe(12.5)
    expect(lireNombre(' 3 ')).toBe(3)
    expect(lireNombre('')).toBeNull()
    expect(lireNombre('abc')).toBeNull()
    expect(lireNombre('Infinity')).toBeNull()
  })
})

describe('moisEcoules', () => {
  it("ne compte un mois que si son jour anniversaire est atteint", () => {
    expect(moisEcoules('2024-01-15', '2024-02-14')).toBe(0)
    expect(moisEcoules('2024-01-15', '2024-02-15')).toBe(1)
    expect(moisEcoules('2024-01-31', '2025-01-30')).toBe(11)
  })

  it('ne devient jamais négatif quand le prêt commence dans le futur', () => {
    expect(moisEcoules('2030-01-01', '2024-01-01')).toBe(0)
  })
})

describe('aujourdhuiIso', () => {
  it('rend la date du jour au format AAAA-MM-JJ', () => {
    expect(aujourdhuiIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
