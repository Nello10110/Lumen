import type { ReactElement } from 'react'
import { fireEvent, render as rtlRender, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Compte, Detenteur, Holding, HoldingDetail, HoldingImmobilier } from '../api/types'
import HoldingDetailContent from './HoldingDetailContent'

// `HoldingDetailContent` lit `useSearchParams()` au montage (retour utilisateur du
// 10/09/2026, lien direct vers l'onglet Paramètres depuis le simulateur
// achat/location) — un contexte `<Router>` est désormais requis pour TOUT rendu de
// ce composant, pas seulement les quelques tests qui exercaient déjà `<Link>`
// (compte rattaché). Remplace `render` importé plutôt que de toucher chacun des
// nombreux appels existants.
function render(ui: ReactElement) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>)
}

// Ce fichier verrouille la répartition entre membres (backlog 2.L.1, déplacée dans l'onglet
// Paramètres au § BN.1 lot 2), la fiche immobilier (backlog 2.M.3) et la structure à trois
// onglets (backlog 2.M.4) — le reste du
// composant (prix, émetteur, look-through...) est hors de son objet.
vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
    createDetenteur: vi.fn(),
    listLoans: vi.fn().mockResolvedValue([]),
    createLoan: vi.fn(),
    updateLoan: vi.fn(),
    setHoldingQuotites: vi.fn(),
    getHoldingDetail: vi.fn(),
    updateHolding: vi.fn(),
    getHoldingPriceHistory: vi.fn().mockResolvedValue({ points: [], volatilite_annualisee_pct: null, max_drawdown_pct: null }),
    updateHoldingImmobilier: vi.fn(),
    getHoldingValuationHistory: vi.fn().mockResolvedValue([]),
    setHoldingValorisation: vi.fn(),
    updateHoldingValuationPoint: vi.fn(),
    deleteHoldingValuationPoint: vi.fn(),
  },
}))

vi.mock('../hooks/usePreferencesAffichage', () => ({
  usePreferencesAffichage: () => ({ lentille: 'net', setLentille: vi.fn(), montantsMasques: false, toggleMontantsMasques: vi.fn(), detenteurId: null, setDetenteurId: vi.fn() }),
}))

function detail(overrides: Partial<HoldingDetail> = {}): HoldingDetail {
  return {
    id: 1,
    ticker: 'AAPL',
    nom: 'Apple Inc.',
    type_actif: 'STOCK',
    compte: null,
    quantite: 10,
    prix_revient_moyen: 100,
    cout_acquisition_total: 100,
    prix_actuel: 150,
    valeur: 1500,
    devise: 'USD',
    secteur: 'Technologie',
    pays: 'États-Unis',
    zone_geo: null,
    secteur_declare: null,
    rendement_depuis_achat_pct: 50,
    rendement_annualise_pct: 10,
    emetteur: null,
    resume: null,
    frais_gestion_pct: null,
    frais_transaction_payes: 0,
    repartition_geo: [],
    repartition_sector: [],
    repartition_geo_detaillee: [],
    repartition_sector_detaillee: [],
    composition_actions: [],
    quotites: [],
    immobilier: null,
    valeur_estimee: null,
    date_valeur_estimee: null,
    versement_mensuel: null,
    date_acquisition: null,
    ...overrides,
  }
}

function detenteur(overrides: Partial<Detenteur> = {}): Detenteur {
  return { id: 1, nom: 'Alice', created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00', ...overrides }
}

// Fiche à onglets (backlog 2.M.4) : Aperçu est l'onglet par défaut, Analyse (détenteurs,
// répartitions) et Paramètres (caractéristiques immobilières) demandent un clic.
function ouvrirOnglet(nom: string) {
  fireEvent.click(screen.getByRole('tab', { name: nom }))
}

describe('HoldingDetailContent — répartition entre membres (backlog 2.L.1, § BN.1 lot 2)', () => {
  it("l'onglet Analyse est une lecture seule : plus aucune carte de répartition à éditer", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' })])
    render(<HoldingDetailContent detail={detail()} onRecharger={vi.fn()} />)
    ouvrirOnglet('Analyse')

    expect(screen.queryByText('Détenteurs')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Part de Alice (%)')).not.toBeInTheDocument()
    expect(api.listDetenteurs).not.toHaveBeenCalled()
  })

  it("sans membre déclaré, l'onglet Paramètres le dit au lieu d'effacer la carte", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail()} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')

    expect(await screen.findByText(/Aucun membre du foyer n'est encore déclaré/)).toBeInTheDocument()
  })

  it('affiche une ligne éditable par membre, préremplie avec les quotités existantes', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' }), detenteur({ id: 2, nom: 'Bob' })])
    render(
      <HoldingDetailContent
        detail={detail({ quotites: [{ detenteur_id: 1, detenteur_nom: 'Alice', quotite_pct: 60, part_detenue: 900, part_nette: 900 }] })}
        onRecharger={vi.fn()}
      />,
    )
    ouvrirOnglet('Paramètres')

    expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(60)
    expect(screen.getByLabelText('Part de Bob (%)')).toBeInTheDocument()
  })

  it('le bouton Enregistrer est désactivé tant que la somme des quotités saisies ne fait pas 100 %', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' }), detenteur({ id: 2, nom: 'Bob' })])
    render(<HoldingDetailContent detail={detail()} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')
    const champAlice = await screen.findByLabelText('Part de Alice (%)')

    // Parts égales proposées (50 / 50) : Alice à 60 fait 110 %.
    fireEvent.change(champAlice, { target: { value: '60' } })

    expect(screen.getByRole('button', { name: 'Enregistrer la répartition' })).toBeDisabled()
    expect(screen.getByText(/Il y a 10\s%\sde trop/)).toBeInTheDocument()
  })

  it('enregistrer une répartition valide appelle setHoldingQuotites puis demande de recharger la fiche', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' }), detenteur({ id: 2, nom: 'Bob' })])
    vi.mocked(api.setHoldingQuotites).mockResolvedValue({ ok: true })
    const onRecharger = vi.fn()
    render(<HoldingDetailContent detail={detail()} onRecharger={onRecharger} />)
    ouvrirOnglet('Paramètres')

    fireEvent.change(await screen.findByLabelText('Part de Alice (%)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la répartition' }))

    await vi.waitFor(() =>
      expect(api.setHoldingQuotites).toHaveBeenCalledWith(1, [
        { detenteur_id: 1, quotite_pct: 60 },
        { detenteur_id: 2, quotite_pct: 40 },
      ]),
    )
    await vi.waitFor(() => expect(onRecharger).toHaveBeenCalled())
  })
})

describe('HoldingDetailContent — Compte rattaché (écran Comptes, backlog X.1)', () => {
  function compte(overrides: Partial<Compte> = {}): Compte {
    return { id: 1, nom: 'PEA', etablissement: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00', ...overrides }
  }

  it("n'affiche aucun badge de compte quand la ligne n'est rattachée à aucun compte", () => {
    render(<HoldingDetailContent detail={detail({ compte: null })} onRecharger={vi.fn()} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('affiche le nom du compte rattaché, en lien vers sa fiche', () => {
    render(<HoldingDetailContent detail={detail({ compte: compte({ id: 42, nom: 'PEA' }) })} onRecharger={vi.fn()} />)

    expect(screen.getByRole('link', { name: 'PEA' })).toHaveAttribute('href', '/comptes/42')
  })

  it("la répartition (onglet Paramètres) renvoie aussi vers la fiche du compte, si la ligne en a un", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' })])
    render(<HoldingDetailContent detail={detail({ compte: compte({ id: 42, nom: 'PEA' }) })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')
    await screen.findByLabelText('Part de Alice (%)')

    // Deux liens "PEA" : le badge de l'en-tête et celui-ci, dans le texte
    // d'introduction de la répartition.
    const liensPEA = screen.getAllByRole('link', { name: 'PEA' })
    expect(liensPEA).toHaveLength(2)
    for (const lien of liensPEA) expect(lien).toHaveAttribute('href', '/comptes/42')
  })
})

function immobilier(overrides: Partial<HoldingImmobilier> = {}): HoldingImmobilier {
  return {
    loyer_mensuel: 1000,
    charges_mensuelles: 100,
    frais_annuels: 2400,
    frais_notaire: null,
    frais_travaux: null,
    frais_acquisition_autres: null,
    surface_m2: 50,
    residence_principale: false,
    simulation_loyer_estime: null,
    simulation_taxe_habitation_annuelle: null,
    cashflow_mensuel: 700,
    rentabilite_brute_pct: 6,
    rentabilite_nette_pct: 4.2,
    prix_m2: 5000,
    emprunt_mensualite: null,
    prix_acquisition_total: 200000,
    ...overrides,
  }
}

// `Holding` renvoyé par `updateHoldingValuationPoint`/`deleteHoldingValuationPoint`
// (backlog quickwin § T.3) — sa valeur n'est pas exploitée par `ImmobilierApercu`
// (seul `EpargneApercu`/`LigneEpargne` en tirent la "valeur actuelle" resynchronisée,
// couverts ailleurs) : un objet minimal type-complet suffit ici.
function holdingApresAction(): Holding {
  return {
    id: 1,
    ticker: 'AAPL',
    nom: null,
    quantite: 1,
    prix_revient_moyen: null,
    cout_acquisition_total: null,
    compte: null,
    type_actif: 'REAL_ESTATE',
    origine: 'manuel',
    created_at: '2026-01-01T00:00:00',
    updated_at: '2026-01-01T00:00:00',
    market_data: null,
    rendement_depuis_achat_pct: null,
    rendement_annualise_pct: null,
    valeur: null,
    valeur_estimee: 220000,
    date_valeur_estimee: '2026-01-01T00:00:00',
    taux_pct: null,
    zone_geo: null,
    secteur: null,
    versement_mensuel: null,
    date_acquisition: null,
  }
}

describe('HoldingDetailContent — Fiche immobilier (backlog 2.M.3)', () => {
  it("n'affiche pas la fiche immobilier pour une position boursière", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'STOCK' })} onRecharger={vi.fn()} />)

    ouvrirOnglet('Paramètres')

    await screen.findByText('Classification géographique et sectorielle')
    expect(screen.queryByRole('button', { name: /Financement et revenus/ })).not.toBeInTheDocument()
    expect(api.getHoldingValuationHistory).not.toHaveBeenCalled()
  })

  it("affiche, pour un bien immobilier, quatre sections repliables dans l'ordre du formulaire d'ajout, la première ouverte", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: null })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')

    await screen.findByLabelText('Nom du bien')
    const sections = ['Le bien', 'Financement et revenus', 'Qui le détient', 'Classification'].map((nom) =>
      screen.getByRole('button', { name: new RegExp(`^${nom}`) }),
    )
    expect(sections.map((b) => b.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false', 'false'])
    expect(screen.queryByText('Cashflow et rentabilité')).not.toBeInTheDocument()
  })

  it('affiche le cashflow, les rentabilités et le prix au m² déjà calculés', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)

    await screen.findByText('Cashflow et rentabilité')
    expect(screen.getByText('700,00 €')).toBeInTheDocument()
    expect(screen.getByText('+6,0 %')).toBeInTheDocument()
    expect(screen.getByText('+4,2 %')).toBeInTheDocument()
    expect(screen.getByText('5 000,00 €')).toBeInTheDocument()
  })

  it("affiche le prix d'acquisition total et le badge « Résidence principale » quand renseignés", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(
      <HoldingDetailContent
        detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier({ residence_principale: true, prix_acquisition_total: 215000 }) })}
      onRecharger={vi.fn()} />,
    )

    await screen.findByText('Cashflow et rentabilité')
    expect(screen.getByText("Résidence principale")).toBeInTheDocument()
    expect(screen.getByText('215 000,00 €')).toBeInTheDocument()
  })

  it("n'affiche pas le badge « Résidence principale » quand la fiche ne l'indique pas", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier({ residence_principale: false }) })} onRecharger={vi.fn()} />)

    await screen.findByText('Cashflow et rentabilité')
    expect(screen.queryByText('Résidence principale')).not.toBeInTheDocument()
  })

  it('enregistrer « Le bien » appelle updateHoldingImmobilier avec les champs de la fiche, puis recharge la fiche', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.updateHoldingImmobilier).mockResolvedValue(immobilier())
    vi.mocked(api.updateHolding).mockClear()
    const onRecharger = vi.fn()
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: null })} onRecharger={onRecharger} />)
    ouvrirOnglet('Paramètres')
    await screen.findByLabelText('Nom du bien')

    fireEvent.click(screen.getByLabelText(/Investissement locatif/))
    fireEvent.change(screen.getByLabelText(/Surface/), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: /Frais d'acquisition/ }))
    fireEvent.change(screen.getByLabelText('Frais de notaire (€)'), { target: { value: '10000' } })
    fireEvent.change(screen.getByLabelText('Travaux (€)'), { target: { value: '5000' } })
    // Le loyer vit dans « Financement et revenus » : un bien locatif en exige un (0 si vacant).
    fireEvent.click(screen.getByRole('button', { name: /^Financement et revenus/ }))
    fireEvent.change(screen.getByLabelText('Loyer mensuel (€)'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le bien' }))

    await vi.waitFor(() =>
      expect(api.updateHoldingImmobilier).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          loyer_mensuel: 1000,
          surface_m2: 50,
          frais_notaire: 10000,
          frais_travaux: 5000,
          residence_principale: false,
        }),
      ),
    )
    // Rien n'a changé côté ligne (nom, prix, valeur, date) : pas de PATCH, donc pas de point
    // fabriqué dans l'historique des valorisations.
    expect(api.updateHolding).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(onRecharger).toHaveBeenCalled())
  })

  it('un changement de nom ou de prix part dans updateHolding, et seulement ce qui a changé', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.updateHolding).mockResolvedValue(holdingApresAction())
    vi.mocked(api.updateHoldingImmobilier).mockResolvedValue(immobilier())
    render(
      <HoldingDetailContent
        detail={detail({ type_actif: 'REAL_ESTATE', nom: 'Ancien nom', prix_revient_moyen: 200000, valeur_estimee: 250000, immobilier: immobilier() })}
        onRecharger={vi.fn()}
      />,
    )
    ouvrirOnglet('Paramètres')

    fireEvent.change(await screen.findByLabelText('Nom du bien'), { target: { value: 'Appartement Lyon' } })
    fireEvent.change(screen.getByLabelText("Prix d'achat (€)"), { target: { value: '210000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le bien' }))

    await vi.waitFor(() => expect(api.updateHolding).toHaveBeenCalledWith(1, { nom: 'Appartement Lyon', prix_revient_moyen: 210000 }))
  })

  it("un bien locatif sans loyer n'est pas enregistré : le message est sous le champ, qui prend le focus", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.updateHoldingImmobilier).mockClear()
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier({ loyer_mensuel: 1000 }) })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')
    fireEvent.click(await screen.findByRole('button', { name: /^Financement et revenus/ }))
    fireEvent.change(screen.getByLabelText('Loyer mensuel (€)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le financement' }))

    expect(await screen.findByText('Indique le loyer mensuel (0 si le bien est vacant).')).toBeInTheDocument()
    expect(api.updateHoldingImmobilier).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(screen.getByLabelText('Loyer mensuel (€)')).toHaveFocus())
  })

  it('les charges mensuelles restent saisissables, avec leur aide, et les champs retirés ont disparu (§ BN.1)', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')
    fireEvent.click(await screen.findByRole('button', { name: /^Financement et revenus/ }))

    expect(screen.getByLabelText(/Charges mensuelles \(€\)/)).toBeInTheDocument()
    expect(screen.getByText(/Les charges que tu paies chaque mois pour ce bien/)).toBeInTheDocument()
    for (const retire of [/Type de location/, /Nombre de pièces/, /Année de construction/, /DPE/, /Charges mensuelles de comparaison/]) {
      expect(screen.queryByLabelText(retire)).not.toBeInTheDocument()
    }
  })

  it("le loyer d'un bien équivalent et la taxe d'habitation du simulateur n'apparaissent que pour une résidence principale (§ BN.1)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(
      <HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier({ residence_principale: false }) })} onRecharger={vi.fn()} />,
    )
    ouvrirOnglet('Paramètres')
    fireEvent.click(await screen.findByRole('button', { name: /^Financement et revenus/ }))
    expect(screen.queryByRole('button', { name: /Comparer avec la location/ })).not.toBeInTheDocument()

    // « Le bien » est restée ouverte : on y change le type, puis on revient aux revenus.
    fireEvent.click(screen.getByLabelText(/Résidence principale/))
    fireEvent.click(screen.getByRole('button', { name: /Comparer avec la location/ }))

    expect(screen.getByLabelText(/Loyer d'un bien équivalent/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Taxe d'habitation annuelle/)).toBeInTheDocument()
    expect(screen.getByText(/n'alimentent que le comparatif « Achat vs location »/)).toBeInTheDocument()
  })

  it('confirme « Enregistré » après un enregistrement réussi, et le retire dès que le formulaire change (§ BN.1)', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.updateHoldingImmobilier).mockResolvedValue(immobilier())
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')
    await screen.findByLabelText('Nom du bien')
    expect(screen.queryByText('Enregistré')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le bien' }))

    expect(await screen.findByText('Enregistré')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Nom du bien'), { target: { value: 'Autre nom' } })
    expect(screen.queryByText('Enregistré')).not.toBeInTheDocument()
  })

  it("ne confirme pas « Enregistré » quand l'enregistrement échoue", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.updateHoldingImmobilier).mockRejectedValue(new Error('Le loyer mensuel ne peut pas être négatif'))
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')
    await screen.findByLabelText('Nom du bien')

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le bien' }))

    expect(await screen.findByText('Le loyer mensuel ne peut pas être négatif')).toBeInTheDocument()
    expect(screen.queryByText('Enregistré')).not.toBeInTheDocument()
  })

  it("la répartition d'un bien est dans la section « Qui le détient » des Paramètres, avec la part nette après emprunt", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([detenteur({ nom: 'Alice' }), detenteur({ id: 2, nom: 'Bob' })])
    vi.mocked(api.listLoans).mockResolvedValue([
      {
        id: 4,
        libelle: 'Crédit',
        capital_initial: 100000,
        taux_annuel_pct: 2,
        mensualite: 600,
        date_debut: '2020-01-01T00:00:00',
        duree_mois: 240,
        capital_restant_du_manuel: null,
        derniere_maj_manuelle: null,
        capital_restant_du: 80000,
        holding_id: 1,
        etablissement_id: null,
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
      },
    ])
    render(
      <HoldingDetailContent
        detail={detail({
          type_actif: 'REAL_ESTATE',
          valeur: 300000,
          immobilier: immobilier(),
          quotites: [
            { detenteur_id: 1, detenteur_nom: 'Alice', quotite_pct: 50, part_detenue: 150000, part_nette: 110000 },
            { detenteur_id: 2, detenteur_nom: 'Bob', quotite_pct: 50, part_detenue: 150000, part_nette: 110000 },
          ],
        })}
        onRecharger={vi.fn()}
      />,
    )
    ouvrirOnglet('Paramètres')
    fireEvent.click(await screen.findByRole('button', { name: /^Qui le détient/ }))

    expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(50)
    // 50 % de (300 000 − 80 000 de capital restant dû) = 110 000 chacun.
    expect(await screen.findAllByText(/Part nette\s:\s110\s000\s€/)).toHaveLength(2)
    expect(screen.getByText('Le prêt suit la même répartition.')).toBeInTheDocument()
  })

  it("l'onglet Analyse d'un bien n'affiche pas les deux cartes vides « Titre unique, pas de décomposition »", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', nom: 'Maison', immobilier: immobilier() })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Analyse')

    expect(screen.queryByText('Répartition géographique')).not.toBeInTheDocument()
    expect(screen.queryByText('Répartition sectorielle')).not.toBeInTheDocument()
    expect(screen.queryByText(/Titre unique/)).not.toBeInTheDocument()
  })

  it('un titre unique garde, lui, ses cartes de répartition', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'STOCK' })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Analyse')

    expect(await screen.findByText('Répartition géographique')).toBeInTheDocument()
    expect(screen.getAllByText(/Titre unique/)).toHaveLength(2)
  })

  it("le ticker n'est pas répété à côté du nom d'un bien saisi à la main, ni quand il est le titre lui-même", () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    const { unmount } = render(
      <HoldingDetailContent detail={detail({ ticker: 'APPART-LYON', nom: 'Appartement Lyon', type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { name: 'Appartement Lyon' })).toBeInTheDocument()
    expect(screen.queryByText('APPART-LYON')).not.toBeInTheDocument()
    unmount()

    render(<HoldingDetailContent detail={detail({ ticker: 'XYZ', nom: null, type_actif: 'STOCK' })} onRecharger={vi.fn()} />)
    expect(screen.getAllByText('XYZ')).toHaveLength(1)
  })

  it("garde le ticker d'un titre coté nommé (Apple Inc. · AAPL)", () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail()} onRecharger={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Apple Inc.' })).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it("affiche l'historique de valorisation, la ligne la plus récente en premier", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([
      { id: 1, date_valeur: '2025-01-01T00:00:00', valeur: 200000, versement: null },
      { id: 2, date_valeur: '2026-01-01T00:00:00', valeur: 220000, versement: null },
    ])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)

    await screen.findByText('Historique de valorisation')
    const lignes = screen.getAllByRole('row').slice(1) // ignore l'en-tête
    expect(within(lignes[0]).getByText('220 000,00 €')).toBeInTheDocument()
    expect(within(lignes[1]).getByText('200 000,00 €')).toBeInTheDocument()
  })

  it("affiche un graphique d'évolution dès que l'historique compte au moins deux points (retour utilisateur 25/08)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([
      { id: 1, date_valeur: '2025-01-01T00:00:00', valeur: 200000, versement: null },
      { id: 2, date_valeur: '2026-01-01T00:00:00', valeur: 220000, versement: null },
    ])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)

    await screen.findByText('Historique de valorisation')
    expect(document.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it("n'affiche pas de graphique pour un unique point d'historique (rien à tracer)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([{ id: 1, date_valeur: '2026-01-01T00:00:00', valeur: 220000, versement: null }])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)

    await screen.findByText('Historique de valorisation')
    expect(document.querySelector('.recharts-responsive-container')).not.toBeInTheDocument()
  })

  it("un unique point d'historique + une date d'acquisition antérieure affiche quand même le graphique (retour utilisateur, 26/08/2026)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([{ id: 1, date_valeur: '2026-01-01T00:00:00', valeur: 220000, versement: null }])
    render(
      <HoldingDetailContent
        detail={detail({
          type_actif: 'REAL_ESTATE',
          immobilier: immobilier(),
          date_acquisition: '2019-06-15T00:00:00',
          prix_revient_moyen: 180000,
        })}
      onRecharger={vi.fn()} />,
    )

    await screen.findByText('Historique de valorisation')
    expect(document.querySelector('.recharts-responsive-container')).toBeInTheDocument()
    expect(screen.getByText(/coût d'acquisition.*ajouté au graphique/)).toBeInTheDocument()
    // Le tableau, lui, reste le reflet exact des points réellement saisis — pas de
    // ligne fabriquée à 180 000,00 €.
    const lignes = screen.getAllByRole('row').slice(1)
    expect(lignes).toHaveLength(1)
    expect(within(lignes[0]).getByText('220 000,00 €')).toBeInTheDocument()
  })

  it("une date d'acquisition POSTÉRIEURE au premier point connu n'ajoute rien (donnée déjà plus ancienne et plus fiable)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([{ id: 1, date_valeur: '2020-01-01T00:00:00', valeur: 200000, versement: null }])
    render(
      <HoldingDetailContent
        detail={detail({
          type_actif: 'REAL_ESTATE',
          immobilier: immobilier(),
          date_acquisition: '2024-06-15T00:00:00',
          prix_revient_moyen: 180000,
        })}
      onRecharger={vi.fn()} />,
    )

    await screen.findByText('Historique de valorisation')
    expect(document.querySelector('.recharts-responsive-container')).not.toBeInTheDocument()
    expect(screen.queryByText(/coût d'acquisition.*ajouté au graphique/)).not.toBeInTheDocument()
  })

  it("Modifier pré-remplit le point puis Enregistrer appelle updateHoldingValuationPoint (backlog quickwin § T.3)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValueOnce([{ id: 7, date_valeur: '2026-01-01T00:00:00', valeur: 0, versement: null }])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValueOnce([{ id: 7, date_valeur: '2026-01-01T00:00:00', valeur: 220000, versement: null }])
    vi.mocked(api.updateHoldingValuationPoint).mockResolvedValue(holdingApresAction())
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)

    await screen.findByText('Historique de valorisation')
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))

    expect(screen.getByLabelText('Valeur du 01/01/2026 (édition)')).toHaveValue(0)
    expect(screen.getByLabelText('Date du 01/01/2026 (édition)')).toHaveValue('2026-01-01')
    fireEvent.change(screen.getByLabelText('Valeur du 01/01/2026 (édition)'), { target: { value: '220000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await vi.waitFor(() =>
      expect(api.updateHoldingValuationPoint).toHaveBeenCalledWith(1, 7, { valeur: 220000, date: '2026-01-01', versement: null }),
    )
    // Rafraîchit l'historique après coup — la nouvelle valeur remplace l'ancienne dans le tableau.
    await screen.findByText('220 000,00 €')
    expect(screen.queryByLabelText('Valeur du 01/01/2026 (édition)')).not.toBeInTheDocument()
  })

  it('Supprimer demande confirmation avant deleteHoldingValuationPoint (backlog quickwin § T.3)', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValueOnce([{ id: 7, date_valeur: '2026-01-01T00:00:00', valeur: 220000, versement: null }])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValueOnce([])
    vi.mocked(api.deleteHoldingValuationPoint).mockResolvedValue(holdingApresAction())
    render(<HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />)

    await screen.findByText('Historique de valorisation')
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    const dialogue = screen.getByRole('dialog')
    expect(api.deleteHoldingValuationPoint).not.toHaveBeenCalled()
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Supprimer' }))

    await vi.waitFor(() => expect(api.deleteHoldingValuationPoint).toHaveBeenCalledWith(1, 7))
  })
})

describe('HoldingDetailContent — Écran Épargne, fiche détaillée (backlog 2.S.1)', () => {
  it("n'affiche pas la fiche Épargne pour un véhicule (hors périmètre, décision du 25/08/2026)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    // Réinitialise le compteur d'appels : ce mock n'est pas remis à zéro entre les
    // tests de ce fichier (pas de `clearMocks` global, cf. `src/test/setup.ts`), et
    // des tests précédents (fiche immobilier) l'ont déjà invoqué.
    vi.mocked(api.getHoldingValuationHistory).mockClear()
    render(<HoldingDetailContent detail={detail({ type_actif: 'VEHICLE' })} onRecharger={vi.fn()} />)

    await vi.waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
    expect(screen.queryByText('Versement mensuel déclaré')).not.toBeInTheDocument()
    expect(api.getHoldingValuationHistory).not.toHaveBeenCalled()
  })

  it("charge et affiche l'historique daté pour un compte Épargne (pas seulement l'immobilier)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([{ id: 1, date_valeur: '2026-01-01T00:00:00', valeur: 10000, versement: null }])
    render(
      <HoldingDetailContent
        detail={detail({ type_actif: 'LIFE_INSURANCE', valeur_estimee: 10000, date_valeur_estimee: '2026-01-01T00:00:00' })}
      onRecharger={vi.fn()} />,
    )

    await vi.waitFor(() => expect(api.getHoldingValuationHistory).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Historique de valorisation')).toBeInTheDocument()
    // "10 000,00 €" apparaît deux fois : la "Valeur actuelle" et la ligne d'historique.
    expect(screen.getAllByText('10 000,00 €')).toHaveLength(2)
  })

  it('remplace la courbe de cours par la fiche Épargne pour un type couvert par TYPES_EPARGNE', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'CASH_ACCOUNT' })} onRecharger={vi.fn()} />)

    expect(await screen.findByText('Versement mensuel déclaré')).toBeInTheDocument()
  })

  it('ajouter une valorisation appelle setHoldingValorisation et met à jour la valeur actuelle affichée', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([])
    vi.mocked(api.setHoldingValorisation).mockResolvedValue({
      id: 1,
      ticker: 'AAPL',
      nom: 'Assurance-vie',
      quantite: 1,
      prix_revient_moyen: null,
      cout_acquisition_total: null,
      compte: null,
      type_actif: 'LIFE_INSURANCE',
      origine: 'manuel',
      created_at: '2026-01-01T00:00:00',
      updated_at: '2026-01-01T00:00:00',
      market_data: null,
      rendement_depuis_achat_pct: null,
      rendement_annualise_pct: null,
      valeur: 12000,
      valeur_estimee: 12000,
      date_valeur_estimee: '2026-03-15T00:00:00',
      taux_pct: null,
      zone_geo: null,
      secteur: null,
      versement_mensuel: null,
      date_acquisition: null,
    })
    render(<HoldingDetailContent detail={detail({ type_actif: 'LIFE_INSURANCE', valeur_estimee: 10000 })} onRecharger={vi.fn()} />)
    await screen.findByLabelText('Valeur (€)')

    fireEvent.change(screen.getByLabelText('Valeur (€)'), { target: { value: '12000' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une valorisation' }))

    await vi.waitFor(() =>
      expect(api.setHoldingValorisation).toHaveBeenCalledWith(1, { valeur: 12000, date: '2026-03-15', versement: null }),
    )
    expect(await screen.findByText('12 000,00 €')).toBeInTheDocument()
  })

  it("ajouter une valorisation avec un « dont versement » l'inclut dans l'appel (backlog § U.2)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([])
    vi.mocked(api.setHoldingValorisation).mockResolvedValue(holdingApresAction())
    render(<HoldingDetailContent detail={detail({ type_actif: 'LIFE_INSURANCE', valeur_estimee: 10000 })} onRecharger={vi.fn()} />)
    await screen.findByLabelText('Valeur (€)')

    fireEvent.change(screen.getByLabelText('Valeur (€)'), { target: { value: '12000' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-15' } })
    fireEvent.change(screen.getByLabelText('Dont versement (€)'), { target: { value: '1500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une valorisation' }))

    await vi.waitFor(() =>
      expect(api.setHoldingValorisation).toHaveBeenCalledWith(1, { valeur: 12000, date: '2026-03-15', versement: 1500 }),
    )
  })

  it('modifier un point pré-remplit le versement déclaré et le renvoie à la sauvegarde (backlog § U.2)', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([
      { id: 7, date_valeur: '2026-01-01T00:00:00', valeur: 12000, versement: 1500 },
    ])
    vi.mocked(api.updateHoldingValuationPoint).mockResolvedValue(holdingApresAction())
    render(<HoldingDetailContent detail={detail({ type_actif: 'LIFE_INSURANCE', immobilier: null })} onRecharger={vi.fn()} />)

    await screen.findByText('Historique de valorisation')
    expect(screen.getByText('dont 1 500,00 € versés')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))

    expect(screen.getByLabelText('Versement du 01/01/2026 (édition)')).toHaveValue(1500)
    fireEvent.change(screen.getByLabelText('Versement du 01/01/2026 (édition)'), { target: { value: '1800' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await vi.waitFor(() =>
      expect(api.updateHoldingValuationPoint).toHaveBeenCalledWith(1, 7, { valeur: 12000, date: '2026-01-01', versement: 1800 }),
    )
  })

  it("le bouton « Plus-value » est désactivé sans point antérieur connu (première valorisation)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'LIFE_INSURANCE', valeur_estimee: 10000 })} onRecharger={vi.fn()} />)

    await screen.findByLabelText('Valeur (€)')
    expect(screen.getByRole('button', { name: 'Plus-value' })).toBeDisabled()
  })

  it('ajouter une valorisation en indiquant la plus-value (plutôt que le versement) déduit le versement à envoyer', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([
      { id: 1, date_valeur: '2025-01-01T00:00:00', valeur: 10000, versement: null },
    ])
    vi.mocked(api.setHoldingValorisation).mockResolvedValue(holdingApresAction())
    render(<HoldingDetailContent detail={detail({ type_actif: 'LIFE_INSURANCE', valeur_estimee: 10000 })} onRecharger={vi.fn()} />)
    await screen.findByLabelText('Valeur (€)')

    fireEvent.change(screen.getByLabelText('Valeur (€)'), { target: { value: '12000' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-03-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Plus-value' }))
    fireEvent.change(screen.getByLabelText('Dont plus-value (€)'), { target: { value: '1200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une valorisation' }))

    // Évolution 10 000 -> 12 000 = 2 000 ; plus-value déclarée 1 200 => versement déduit 800.
    await vi.waitFor(() =>
      expect(api.setHoldingValorisation).toHaveBeenCalledWith(1, { valeur: 12000, date: '2026-03-15', versement: 800 }),
    )
  })

  it('modifier un point en indiquant la plus-value déduit le versement envoyé (backlog suite § U.2)', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.getHoldingValuationHistory).mockResolvedValue([
      { id: 1, date_valeur: '2025-01-01T00:00:00', valeur: 10000, versement: null },
      { id: 2, date_valeur: '2026-01-01T00:00:00', valeur: 12000, versement: null },
    ])
    vi.mocked(api.updateHoldingValuationPoint).mockResolvedValue(holdingApresAction())
    render(<HoldingDetailContent detail={detail({ type_actif: 'LIFE_INSURANCE', immobilier: null })} onRecharger={vi.fn()} />)

    await screen.findByText('Historique de valorisation')
    // Liste affichée du plus récent au plus ancien : le premier "Modifier" édite le
    // point 2026 (id 2), dont le prédécesseur chronologique est le point 2025.
    fireEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[0])
    const ligneEdition = screen.getByRole('button', { name: 'Enregistrer' }).closest('tr')!

    fireEvent.click(within(ligneEdition).getByRole('button', { name: 'Plus-value' }))
    fireEvent.change(screen.getByLabelText('Plus-value du 01/01/2026 (édition)'), { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    // Évolution 10 000 -> 12 000 = 2 000 ; plus-value déclarée 500 => versement déduit 1 500.
    await vi.waitFor(() =>
      expect(api.updateHoldingValuationPoint).toHaveBeenCalledWith(1, 2, { valeur: 12000, date: '2026-01-01', versement: 1500 }),
    )
  })
})

describe('HoldingDetailContent — fiche à onglets (backlog 2.M.4)', () => {
  it('affiche les trois onglets, Aperçu sélectionné par défaut', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail()} onRecharger={vi.fn()} />)

    const onglets = screen.getAllByRole('tab')
    expect(onglets.map((o) => o.textContent)).toEqual(['Aperçu', 'Analyse', 'Paramètres'])
    expect(screen.getByRole('tab', { name: 'Aperçu' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Analyse' })).toHaveAttribute('aria-selected', 'false')
  })

  it("l'onglet Aperçu affiche les indicateurs clés et la courbe de cours, pas la répartition géographique", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail()} onRecharger={vi.fn()} />)

    expect(await screen.findByText('Prix de revient')).toBeInTheDocument()
    expect(screen.queryByText('Répartition géographique')).not.toBeInTheDocument()
  })

  it("basculer sur l'onglet Analyse affiche la répartition géographique/sectorielle et masque l'onglet Aperçu", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail()} onRecharger={vi.fn()} />)
    ouvrirOnglet('Analyse')

    expect(await screen.findByText('Répartition géographique')).toBeInTheDocument()
    expect(screen.queryByText('Prix de revient')).not.toBeInTheDocument()
  })

  it("l'onglet Paramètres affiche toujours la classification géographique/sectorielle, même pour une position sans autre réglage (ex. une action)", async () => {
    // Retour utilisateur du 17/09/2026 (§ AP.1/AP.2) : contrairement à la fiche
    // immobilier (réservée aux biens), la classification géo/secteur est éditable
    // pour TOUTE ligne — remplace l'ancien état vide "Aucun paramètre modifiable".
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'STOCK' })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')

    expect(await screen.findByText('Classification géographique et sectorielle')).toBeInTheDocument()
    expect(screen.getByLabelText('Zone géographique')).toBeInTheDocument()
    expect(screen.getByLabelText('Secteur')).toBeInTheDocument()
  })

  it('déclarer une zone géographique et un secteur appelle updateHolding puis recharge la fiche entière', async () => {
    // Retour utilisateur du 17/09/2026 (§ AP.1/AP.2) : « pouvoir éditer... la
    // géographie... de la même façon la répartition sectorielle » — vérifie que
    // les deux champs sont bien envoyés ensemble et que `onRecharger` (pas
    // seulement un état local) est appelé pour refléter le changement dans
    // l'onglet Analyse de cette même fiche.
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.updateHolding).mockResolvedValue({} as never)
    const onRecharger = vi.fn()
    render(<HoldingDetailContent detail={detail({ type_actif: 'BOND', ticker: 'BRICKS-ABC' })} onRecharger={onRecharger} />)
    ouvrirOnglet('Paramètres')

    fireEvent.change(await screen.findByLabelText('Zone géographique'), { target: { value: 'Europe' } })
    fireEvent.change(screen.getByLabelText('Secteur'), { target: { value: 'Immobilier' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la classification' }))

    await vi.waitFor(() => expect(api.updateHolding).toHaveBeenCalledWith(1, { zone_geo: 'Europe', secteur: 'Immobilier' }))
    expect(onRecharger).toHaveBeenCalled()
  })

  it('remettre la classification sur « Détection automatique » envoie null pour effacer la déclaration', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.updateHolding).mockResolvedValue({} as never)
    render(<HoldingDetailContent detail={detail({ type_actif: 'BOND', zone_geo: 'Europe', secteur_declare: 'Immobilier' })} onRecharger={vi.fn()} />)
    ouvrirOnglet('Paramètres')

    fireEvent.change(await screen.findByLabelText('Zone géographique'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Secteur'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la classification' }))

    await vi.waitFor(() => expect(api.updateHolding).toHaveBeenCalledWith(1, { zone_geo: null, secteur: null }))
  })

  it("ouvre directement l'onglet Paramètres quand l'URL le demande (lien depuis le simulateur achat/location, retour utilisateur du 10/09/2026)", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    rtlRender(
      <MemoryRouter initialEntries={['/patrimoine/MAISON?onglet=parametres']}>
        <HoldingDetailContent detail={detail({ type_actif: 'REAL_ESTATE', immobilier: immobilier() })} onRecharger={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: 'Paramètres' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByLabelText('Nom du bien')).toBeInTheDocument()
  })

  it("ignore un onglet inconnu dans l'URL et retombe sur Aperçu", async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    rtlRender(
      <MemoryRouter initialEntries={['/patrimoine/AAPL?onglet=inconnu']}>
        <HoldingDetailContent detail={detail()} onRecharger={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tab', { name: 'Aperçu' })).toHaveAttribute('aria-selected', 'true')
  })

  it('affiche le libellé complet de la taxonomie élargie (backlog 2.M.1) dans le badge de catégorie', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    render(<HoldingDetailContent detail={detail({ type_actif: 'REGULATED_SAVINGS' })} onRecharger={vi.fn()} />)

    expect(await screen.findByText('Épargne réglementée (Livret A, LDDS...)')).toBeInTheDocument()
  })
})
