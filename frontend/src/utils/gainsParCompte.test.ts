import { describe, expect, it } from 'vitest'
import type { Compte, Holding, MarketData } from '../api/types'
import { calculerGainsParCompte } from './gainsParCompte'

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
    // Une cotation par défaut (pas `null`) : la majorité de ce fichier teste le cas
    // ORDINAIRE, une ligne dont la plus-value latente est mesurable. Le cas Bricks.co
    // (sans aucune cotation, `donneesReelles(h)` false) a son propre bloc de tests
    // plus bas, avec `market_data: null` posé explicitement.
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

describe('calculerGainsParCompte', () => {
  it('additionne la plus-value latente (valeur - prix de revient x quantité) par compte', () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'AAA', compte: pea, quantite: 10, prix_revient_moyen: 100, valeur: 1200 }),
      holding({ ticker: 'BBB', compte: pea, quantite: 5, prix_revient_moyen: 50, valeur: 200 }),
    ])

    expect(resultat).toEqual([
      {
        compteId: 1,
        compteNom: 'PEA',
        valeur: 1400, // 1200 + 200
        gain: 150, // (1200-1000) + (200-250) = 200 - 50
        gainPct: (150 / 1250) * 100,
        rendementAnnualise: null,
      },
    ])
  })

  it('exclut une ligne sans prix de revient connu (compte courant, livret...) de toutes les sommes', () => {
    const compteCourant = compte({ id: 2, nom: 'Compte courant' })
    const resultat = calculerGainsParCompte([holding({ compte: compteCourant, prix_revient_moyen: null, valeur: 5000 })])

    expect(resultat).toEqual([])
  })

  it('un compte sans aucune ligne à prix de revient connu est absent du résultat, même mélangé à un autre', () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    const compteCourant = compte({ id: 2, nom: 'Compte courant' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'AAA', compte: pea, quantite: 1, prix_revient_moyen: 100, valeur: 120 }),
      holding({ ticker: 'CASH', compte: compteCourant, prix_revient_moyen: null, valeur: 3000 }),
    ])

    expect(resultat.map((r) => r.compteId)).toEqual([1])
  })

  it('une ligne sans compte rattaché (compte: null) est ignorée', () => {
    const resultat = calculerGainsParCompte([holding({ compte: null, prix_revient_moyen: 100, quantite: 1, valeur: 120 })])

    expect(resultat).toEqual([])
  })

  it('calcule le rendement annualisé pondéré par la valeur, sur les lignes qui en ont un', () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'AAA', compte: pea, quantite: 1, prix_revient_moyen: 100, valeur: 800, rendement_annualise_pct: 10 }),
      holding({ ticker: 'BBB', compte: pea, quantite: 1, prix_revient_moyen: 100, valeur: 200, rendement_annualise_pct: 20 }),
    ])

    // Pondéré par la valeur : (800*10 + 200*20) / (800+200) = 12
    expect(resultat[0].rendementAnnualise).toBeCloseTo(12)
  })

  it("une ligne sans rendement annualisé connu n'entre pas dans la moyenne pondérée", () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'AAA', compte: pea, quantite: 1, prix_revient_moyen: 100, valeur: 500, rendement_annualise_pct: 8 }),
      holding({ ticker: 'BBB', compte: pea, quantite: 1, prix_revient_moyen: 100, valeur: 500, rendement_annualise_pct: null }),
    ])

    expect(resultat[0].rendementAnnualise).toBeCloseTo(8)
  })

  it('gainPct est null quand le coût total est nul (jamais une division par zéro)', () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    const resultat = calculerGainsParCompte([holding({ compte: pea, quantite: 1, prix_revient_moyen: 0, valeur: 50 })])

    expect(resultat[0].gainPct).toBeNull()
  })

  it('trie les comptes par plus-value décroissante', () => {
    const compteA = compte({ id: 1, nom: 'Compte perdant' })
    const compteB = compte({ id: 2, nom: 'Compte gagnant' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'AAA', compte: compteA, quantite: 1, prix_revient_moyen: 100, valeur: 50 }),
      holding({ ticker: 'BBB', compte: compteB, quantite: 1, prix_revient_moyen: 100, valeur: 150 }),
    ])

    expect(resultat.map((r) => r.compteNom)).toEqual(['Compte gagnant', 'Compte perdant'])
  })

  // ---------------------------------------------------------------------------
  // Retour utilisateur du 14/09/2026 : une position Bricks.co affichait « +0 € » de
  // plus-value latente. Un vrai zéro mesuré (rien à comparer, on ne sait pas ce que
  // vaut la ligne aujourd'hui) — pas "aucun gain" — devait afficher « — », pas 0.
  // ---------------------------------------------------------------------------

  it("un compte dont AUCUNE ligne n'a de valorisation réelle connue affiche un gain null, pas zéro", () => {
    const bricksCo = compte({ id: 3, nom: 'Bricks.co' })
    const resultat = calculerGainsParCompte([
      // Valorisée AU COÛT faute de cotation (comme tout ticker Bricks.co réel) :
      // `valeur` retombe exactement sur `cout_acquisition_total x quantite`, ce qui
      // rendrait l'ancien calcul (`valeur - cout`) trivialement nul.
      holding({ ticker: 'BRICKS-ABC', compte: bricksCo, quantite: 10, prix_revient_moyen: 100, valeur: 1000, market_data: null }),
    ])

    expect(resultat).toEqual([
      {
        compteId: 3,
        compteNom: 'Bricks.co',
        valeur: 1000, // le total reste réel : c'est bien la meilleure estimation disponible
        gain: null, // jamais 0 : la mesure elle-même est indisponible, pas "sans gain"
        gainPct: null,
        rendementAnnualise: null,
      },
    ])
  })

  it('un compte MIXTE (une ligne cotée, une valorisée au coût) ne compte que la ligne mesurable dans le gain', () => {
    const pea = compte({ id: 1, nom: 'PEA' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'AAA', compte: pea, quantite: 10, prix_revient_moyen: 100, valeur: 1200 }), // coté, +200
      holding({ ticker: 'BRICKS-ABC', compte: pea, quantite: 10, prix_revient_moyen: 100, valeur: 1000, market_data: null }), // au coût
    ])

    // Valeur totale inclut les deux lignes (2200), le gain ne reflète QUE la ligne
    // cotée (200) — mélanger la valeur de la ligne au coût sans son coût en face
    // (ou l'inverse) ferait apparaître un gain fictif.
    expect(resultat[0].valeur).toBe(2200)
    expect(resultat[0].gain).toBe(200)
  })

  it('une ligne à coût nul (actions offertes) avec une VRAIE cotation compte dans le gain, malgré rendement_depuis_achat_pct=null', () => {
    // `rendement_depuis_achat_pct` est aussi `null` quand le coût est nul (garde
    // `cout_total > EPSILON` côté backend) — ne pas confondre avec « pas de
    // cotation connue » : `donneesReelles()` doit s'appuyer sur `market_data`, pas
    // sur ce champ dérivé, sous peine d'exclure à tort cette ligne de son propre gain.
    const pea = compte({ id: 1, nom: 'PEA' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'GIFT', compte: pea, quantite: 5, prix_revient_moyen: 0, valeur: 200, rendement_depuis_achat_pct: null }),
    ])

    expect(resultat[0].gain).toBe(200) // 200 - 0 : entièrement plus-value, coût nul
    expect(resultat[0].gainPct).toBeNull() // toujours pas de division par un coût nul
  })

  it("gain null trié en fin de liste, quel que soit le signe des autres comptes", () => {
    const compteA = compte({ id: 1, nom: 'Compte perdant' })
    const compteB = compte({ id: 2, nom: 'Compte au coût' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'AAA', compte: compteA, quantite: 1, prix_revient_moyen: 100, valeur: 50 }), // -50
      holding({ ticker: 'BRICKS-ABC', compte: compteB, quantite: 1, prix_revient_moyen: 100, valeur: 100, market_data: null }), // null
    ])

    expect(resultat.map((r) => r.compteNom)).toEqual(['Compte perdant', 'Compte au coût'])
  })

  it('deux comptes du même nom mais dun id différent restent distincts (regroupement par id, pas par nom)', () => {
    const compteA = compte({ id: 1, nom: 'PEA' })
    const compteB = compte({ id: 2, nom: 'PEA' })
    const resultat = calculerGainsParCompte([
      holding({ ticker: 'AAA', compte: compteA, quantite: 1, prix_revient_moyen: 100, valeur: 120 }),
      holding({ ticker: 'BBB', compte: compteB, quantite: 1, prix_revient_moyen: 100, valeur: 90 }),
    ])

    expect(resultat).toHaveLength(2)
  })
})
