import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { Detenteur, Holding, Loan } from '../api/types'
import { simulerLargeurEcran } from '../test/matchMedia'
import AjoutBienImmobilierModale from './AjoutBienImmobilierModale'

vi.mock('../api/client', () => ({
  api: {
    listDetenteurs: vi.fn(),
    createDetenteur: vi.fn(),
    listLoans: vi.fn(),
    createBienImmobilier: vi.fn(),
  },
}))

const HORODATAGE = '2026-01-01T00:00:00'
const ALICE: Detenteur = { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE }
const BOB: Detenteur = { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE }

function pret(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 5,
    libelle: 'Prêt travaux',
    capital_initial: 30000,
    taux_annuel_pct: 2,
    mensualite: 300,
    date_debut: '2024-01-01T00:00:00',
    duree_mois: 120,
    capital_restant_du_manuel: null,
    derniere_maj_manuelle: null,
    capital_restant_du: 25000,
    holding_id: null,
    etablissement_id: null,
    created_at: HORODATAGE,
    updated_at: HORODATAGE,
    ...overrides,
  }
}

const BIEN_CREE = { id: 42, ticker: 'APPARTEMENT-LYON-6E' } as Holding

function ouvrir(props: Partial<React.ComponentProps<typeof AjoutBienImmobilierModale>> = {}) {
  const onClose = vi.fn()
  const onCree = vi.fn()
  render(<AjoutBienImmobilierModale onClose={onClose} onCree={onCree} {...props} />)
  return { onClose, onCree }
}

const section = (nom: RegExp | string) => screen.getByRole('button', { name: typeof nom === 'string' ? new RegExp(`^${nom}`) : nom })

async function remplirLeBien() {
  fireEvent.change(await screen.findByLabelText('Nom du bien'), { target: { value: 'Appartement Lyon 6e' } })
  fireEvent.change(screen.getByLabelText("Prix d'achat (€)"), { target: { value: '250000' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  simulerLargeurEcran(false)
  vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE, BOB])
  vi.mocked(api.listLoans).mockResolvedValue([])
  vi.mocked(api.createBienImmobilier).mockResolvedValue({ holding: BIEN_CREE, pret: null })
})

describe('AjoutBienImmobilierModale — structure', () => {
  it('s’ouvre sur « Ajouter un bien immobilier », avec le focus dans le nom du bien', async () => {
    ouvrir()

    expect(await screen.findByRole('dialog', { name: 'Ajouter un bien immobilier' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Nom du bien')).toHaveFocus())
  })

  it('première section ouverte, les autres repliées, chacune annonçant son état', async () => {
    ouvrir()
    await screen.findByLabelText('Nom du bien')

    expect(section('Le bien')).toHaveAttribute('aria-expanded', 'true')
    expect(section('Financement et revenus')).toHaveAttribute('aria-expanded', 'false')
    expect(await screen.findByRole('button', { name: /^Qui le détient/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('le type de bien se choisit parmi trois cartes (boutons radio), « Résidence principale » par défaut', async () => {
    ouvrir()
    await screen.findByLabelText('Nom du bien')

    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual(['residence_principale', 'locatif', 'autre'])
    expect(screen.getByLabelText(/Résidence principale/)).toBeChecked()
    expect(screen.getByText('Investissement locatif')).toBeInTheDocument()
    expect(screen.getByText('Autre immobilier')).toBeInTheDocument()
  })

  it('les frais d’acquisition et la zone géographique sont repliés, avec leur résumé', async () => {
    ouvrir()
    await screen.findByLabelText('Nom du bien')

    expect(screen.queryByLabelText('Frais de notaire (€)')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Zone géographique/ })).toHaveTextContent('Europe (par défaut)')
    expect(screen.getByRole('button', { name: /Frais d'acquisition/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('les champs numériques ouvrent le pavé décimal, les champs facultatifs sont marqués', async () => {
    ouvrir()

    expect(await screen.findByLabelText("Prix d'achat (€)")).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getByLabelText(/Surface \(m²\)/)).toHaveAccessibleName(/facultatif/)
  })
})

describe('AjoutBienImmobilierModale — aperçu en direct', () => {
  it('sans prix, l’aperçu dit ce qui manque au lieu d’afficher des zéros', async () => {
    ouvrir()
    await screen.findByLabelText('Nom du bien')

    expect(screen.getByText(/Renseigne le prix d'achat pour voir/)).toBeInTheDocument()
  })

  it('suit la saisie : valeur et coût total avec les frais d’acquisition', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(screen.getByRole('button', { name: /Frais d'acquisition/ }))
    fireEvent.change(screen.getByLabelText('Frais de notaire (€)'), { target: { value: '18000' } })

    const apercu = screen.getByRole('complementary', { name: 'Aperçu' })
    expect(within(apercu).getByText(/250\s000\s€/, { selector: 'dd' })).toBeInTheDocument()
    expect(within(apercu).getByText(/268\s000\s€/)).toBeInTheDocument()
  })

  it('un bien locatif avec un prêt : cashflow et rentabilités calculés comme le serveur', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(screen.getByLabelText(/Investissement locatif/))
    fireEvent.click(section('Financement et revenus'))
    fireEvent.change(screen.getByLabelText('Loyer mensuel (€)'), { target: { value: '1200' } })
    fireEvent.change(screen.getByLabelText(/Charges mensuelles/), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/Frais annuels/), { target: { value: '1200' } })
    fireEvent.click(screen.getByLabelText("J'ai un prêt pour ce bien"))
    fireEvent.change(screen.getByLabelText('Mensualité'), { target: { value: '800' } })

    const apercu = screen.getByRole('complementary', { name: 'Aperçu' })
    // 1 200 − 100 − 1 200 ÷ 12 − 800 = 200 ; 14 400 ÷ 250 000 = 5,76 % ; (14 400 − 2 400) ÷ 250 000 = 4,8 %.
    expect(within(apercu).getByText(/\+200\s€/)).toBeInTheDocument()
    expect(within(apercu).getByText(/5,8\s%\s\/\s4,8\s%/)).toBeInTheDocument()
    expect(within(apercu).getByText(/800\s€\/mois/)).toBeInTheDocument()
  })

  it('une résidence principale n’affiche ni cashflow ni rentabilité', async () => {
    ouvrir()
    await remplirLeBien()

    const apercu = screen.getByRole('complementary', { name: 'Aperçu' })
    expect(within(apercu).queryByText('Cashflow mensuel')).not.toBeInTheDocument()
    expect(within(apercu).queryByText(/Rentabilité/)).not.toBeInTheDocument()
  })

  it('la part nette de chacun tient compte du prêt (le prêt suit la répartition du bien)', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(section('Financement et revenus'))
    fireEvent.click(screen.getByLabelText("J'ai un prêt pour ce bien"))
    fireEvent.change(screen.getByLabelText('Capital initial'), { target: { value: '100000' } })

    const apercu = screen.getByRole('complementary', { name: 'Aperçu' })
    // Sans date de début ni durée, le capital restant dû est estimé au capital emprunté :
    // (250 000 − 100 000) ÷ 2 = 75 000 chacun.
    expect(within(apercu).getAllByText(/75\s000\s€/)).toHaveLength(2)
    expect(within(apercu).getByText('Part nette de chacun')).toBeInTheDocument()
  })
})

describe('AjoutBienImmobilierModale — estimation du notaire', () => {
  it('ne remplit rien tant qu’on ne clique pas, puis calcule 7,5 % du prix d’achat', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(screen.getByRole('button', { name: /Frais d'acquisition/ }))
    expect(screen.getByLabelText('Frais de notaire (€)')).toHaveValue(null)

    fireEvent.click(screen.getByRole('button', { name: /Estimer le notaire/ }))

    expect(screen.getByLabelText('Frais de notaire (€)')).toHaveValue(18750)
  })

  it('sans prix d’achat, dit d’abord de le renseigner et y met le focus', async () => {
    ouvrir()
    await screen.findByLabelText('Nom du bien')
    fireEvent.click(screen.getByRole('button', { name: /Frais d'acquisition/ }))

    fireEvent.click(screen.getByRole('button', { name: /Estimer le notaire/ }))

    expect(screen.getByText("Renseigne d'abord le prix d'achat.")).toBeInTheDocument()
    expect(screen.getByLabelText("Prix d'achat (€)")).toHaveFocus()
    expect(screen.getByLabelText('Frais de notaire (€)')).toHaveValue(null)
  })
})

describe('AjoutBienImmobilierModale — validation', () => {
  it('le bouton principal reste actif ; au clic sans saisie il dit ce qui manque, sous les champs, avec focus', async () => {
    ouvrir()
    await screen.findByLabelText('Nom du bien')
    const bouton = screen.getByRole('button', { name: 'Ajouter le bien' })
    expect(bouton).toBeEnabled()

    fireEvent.click(bouton)

    expect(await screen.findByText('Donne un nom au bien, par exemple « Appartement Lyon 6e ».', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText("Indique le prix d'achat.", { selector: 'p' })).toBeInTheDocument()
    expect(api.createBienImmobilier).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByLabelText('Nom du bien')).toHaveFocus())
    // Le champ est relié à son erreur et marqué invalide.
    expect(screen.getByLabelText('Nom du bien')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Nom du bien').getAttribute('aria-describedby')).toMatch(/-erreur$/)
  })

  it('un résumé d’erreurs annoncé (role alert) liste chaque correction, cliquable', async () => {
    ouvrir()
    await screen.findByLabelText('Nom du bien')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    const resume = await screen.findByRole('alert')
    expect(resume).toHaveTextContent('2 champs à corriger')
    fireEvent.click(within(resume).getByRole('button', { name: "Indique le prix d'achat." }))
    await waitFor(() => expect(screen.getByLabelText("Prix d'achat (€)")).toHaveFocus())
  })

  it('les erreurs disparaissent d’elles-mêmes à mesure qu’on corrige', async () => {
    ouvrir()
    await screen.findByLabelText('Nom du bien')
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))
    await screen.findByRole('alert')

    fireEvent.change(screen.getByLabelText('Nom du bien'), { target: { value: 'Maison' } })

    expect(screen.queryByText('Donne un nom au bien, par exemple « Appartement Lyon 6e ».', { selector: 'p' })).not.toBeInTheDocument()
    expect(screen.getByText("Indique le prix d'achat.", { selector: 'p' })).toBeInTheDocument()
  })

  it('une erreur dans une section repliée l’ouvre et y met le focus : un bien locatif sans loyer', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(screen.getByLabelText(/Investissement locatif/))
    expect(section('Financement et revenus')).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    await waitFor(() => expect(section('Financement et revenus')).toHaveAttribute('aria-expanded', 'true'))
    await waitFor(() => expect(screen.getByLabelText('Loyer mensuel (€)')).toHaveFocus())
    expect(screen.getByText('Indique le loyer mensuel (0 si le bien est vacant).', { selector: 'p' })).toBeInTheDocument()
    expect(section('Financement et revenus')).toHaveTextContent('1 erreur')
  })

  it('un prêt coché mais incomplet est refusé, champ par champ', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(section('Financement et revenus'))
    fireEvent.click(screen.getByLabelText("J'ai un prêt pour ce bien"))

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    expect(await screen.findByText('Indique le capital emprunté (supérieur à 0).', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Indique la mensualité (supérieure à 0).', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('Indique la date de début du prêt.', { selector: 'p' })).toBeInTheDocument()
    expect(api.createBienImmobilier).not.toHaveBeenCalled()
  })

  it('une répartition qui ne fait pas 100 % bloque l’envoi, avec le correctif sous les yeux', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(await screen.findByRole('button', { name: /^Qui le détient/ }))
    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '40' } })

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Le total des parts doit faire 100 %.')
    expect(screen.getByText(/Il manque 10\s%/)).toBeInTheDocument()
    expect(api.createBienImmobilier).not.toHaveBeenCalled()
  })
})

describe('AjoutBienImmobilierModale — création', () => {
  it('envoie le bien, son prêt et les parts en UN appel, puis rend le bien créé', async () => {
    const { onCree } = ouvrir()
    await remplirLeBien()
    fireEvent.change(screen.getByLabelText(/Date d'achat/), { target: { value: '2022-05-10' } })
    fireEvent.click(screen.getByLabelText(/Investissement locatif/))
    fireEvent.click(section('Financement et revenus'))
    fireEvent.change(screen.getByLabelText('Loyer mensuel (€)'), { target: { value: '1200' } })
    fireEvent.click(screen.getByLabelText("J'ai un prêt pour ce bien"))
    fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'Crédit immobilier' } })
    fireEvent.change(screen.getByLabelText('Capital initial'), { target: { value: '200000' } })
    fireEvent.change(screen.getByLabelText('Taux annuel (%)'), { target: { value: '3.5' } })
    fireEvent.change(screen.getByLabelText('Mensualité'), { target: { value: '900' } })
    fireEvent.change(screen.getByLabelText('Date de début'), { target: { value: '2022-06-01' } })
    fireEvent.change(screen.getByLabelText('Durée (mois)'), { target: { value: '240' } })
    // Parts égales pré-remplies (50 / 50), jamais touchées.
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    await waitFor(() => expect(api.createBienImmobilier).toHaveBeenCalledTimes(1))
    expect(api.createBienImmobilier).toHaveBeenCalledWith({
      nom: 'Appartement Lyon 6e',
      usage: 'locatif',
      prix_achat: 250000,
      date_achat: '2022-05-10',
      valeur_estimee: null,
      frais_notaire: null,
      frais_travaux: null,
      frais_acquisition_autres: null,
      surface_m2: null,
      zone_geo: null,
      loyer_mensuel: 1200,
      charges_mensuelles: null,
      frais_annuels: null,
      simulation_loyer_estime: null,
      simulation_taxe_habitation_annuelle: null,
      pret: { libelle: 'Crédit immobilier', capital_initial: 200000, taux_annuel_pct: 3.5, mensualite: 900, date_debut: '2022-06-01', duree_mois: 240 },
      pret_existant_id: null,
      quotites: [
        { detenteur_id: 1, quotite_pct: 50 },
        { detenteur_id: 2, quotite_pct: 50 },
      ],
    })
    await waitFor(() => expect(onCree).toHaveBeenCalledWith(BIEN_CREE))
  })

  it('une résidence principale n’envoie ni loyer ni frais annuels, même saisis avant de changer de type', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(screen.getByLabelText(/Investissement locatif/))
    fireEvent.click(section('Financement et revenus'))
    fireEvent.change(screen.getByLabelText('Loyer mensuel (€)'), { target: { value: '1200' } })
    fireEvent.click(screen.getByLabelText(/Résidence principale/))
    fireEvent.change(screen.getByLabelText(/Charges mensuelles/), { target: { value: '150' } })

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    await waitFor(() => expect(api.createBienImmobilier).toHaveBeenCalled())
    expect(api.createBienImmobilier).toHaveBeenCalledWith(
      expect.objectContaining({ usage: 'residence_principale', loyer_mensuel: null, frais_annuels: null, charges_mensuelles: 150 }),
    )
  })

  it('rattache un prêt déjà saisi plutôt que d’en recréer un', async () => {
    vi.mocked(api.listLoans).mockResolvedValue([pret({ id: 5 }), pret({ id: 6, libelle: 'Déjà rattaché', holding_id: 99 })])
    ouvrir()
    await remplirLeBien()
    fireEvent.click(section('Financement et revenus'))
    fireEvent.click(screen.getByLabelText("J'ai un prêt pour ce bien"))

    fireEvent.click(screen.getByRole('button', { name: 'Un prêt déjà saisi' }))
    const choix = screen.getByLabelText('Prêt à rattacher')
    // Un prêt qui finance déjà un autre bien n'est pas proposé.
    expect(within(choix).queryByText(/Déjà rattaché/)).not.toBeInTheDocument()
    fireEvent.change(choix, { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    await waitFor(() => expect(api.createBienImmobilier).toHaveBeenCalledWith(expect.objectContaining({ pret: null, pret_existant_id: 5 })))
  })

  it('un refus du serveur garde la saisie, l’explique, et ne ferme rien', async () => {
    vi.mocked(api.createBienImmobilier).mockRejectedValue(new Error('Compte introuvable'))
    const { onCree } = ouvrir()
    await remplirLeBien()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    expect(await screen.findByText('Compte introuvable')).toBeInTheDocument()
    expect(screen.getByText(/Rien n'a été enregistré/)).toBeInTheDocument()
    expect(onCree).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nom du bien')).toHaveValue('Appartement Lyon 6e')
    expect(screen.getByRole('button', { name: 'Ajouter le bien' })).toBeEnabled()
  })
})

describe('AjoutBienImmobilierModale — qui le détient', () => {
  it('pré-remplit à parts égales avec deux membres, 100 % avec un seul', async () => {
    ouvrir()
    await remplirLeBien()
    fireEvent.click(await screen.findByRole('button', { name: /^Qui le détient/ }))
    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(50)
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(50)
  })

  it('un seul membre : 100 % pour lui', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE])
    ouvrir()
    fireEvent.click(await screen.findByRole('button', { name: /^Qui le détient/ }))

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(100)
  })

  it('sans aucun membre : une ligne explicative et l’ajout d’un membre, pas de section vide', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    ouvrir()

    expect(await screen.findByText(/Aucun membre du foyer n'est encore déclaré/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Qui le détient/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter un membre du foyer' })).toBeInTheDocument()
  })

  it('ajouter le premier membre fait apparaître la section, à 100 % pour lui', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    vi.mocked(api.createDetenteur).mockResolvedValue(ALICE)
    ouvrir()

    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter un membre du foyer' }))
    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Alice' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    expect(await screen.findByLabelText('Part de Alice (%)')).toHaveValue(100)
    expect(screen.queryByText(/Aucun membre du foyer n'est encore déclaré/)).not.toBeInTheDocument()
  })

  it('sans membre, le bien est créé sans quotités (il appartient au foyer)', async () => {
    vi.mocked(api.listDetenteurs).mockResolvedValue([])
    ouvrir()
    await remplirLeBien()
    await screen.findByText(/Aucun membre du foyer n'est encore déclaré/)

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter le bien' }))

    await waitFor(() => expect(api.createBienImmobilier).toHaveBeenCalledWith(expect.objectContaining({ quotites: [] })))
  })
})

describe('AjoutBienImmobilierModale — fermeture', () => {
  it('sans saisie, Annuler ferme sans rien demander', async () => {
    const { onClose } = ouvrir()
    await screen.findByLabelText('Nom du bien')

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(onClose).toHaveBeenCalled()
  })

  it('avec une saisie en cours, demande confirmation avant d’abandonner', async () => {
    const { onClose } = ouvrir()
    await remplirLeBien()

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Abandonner la saisie ?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continuer la saisie' }))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nom du bien')).toHaveValue('Appartement Lyon 6e')

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abandonner' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('Échap suit le même chemin que le bouton : confirmation si une saisie est en cours', async () => {
    const { onClose } = ouvrir()
    await remplirLeBien()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Abandonner la saisie ?' })).toBeInTheDocument()
  })
})

describe('AjoutBienImmobilierModale — mobile', () => {
  beforeEach(() => simulerLargeurEcran(true))

  it('l’aperçu devient une section, et un résumé reste collé en bas avec les boutons', async () => {
    ouvrir()
    await remplirLeBien()

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Aperçu/ })).toHaveAttribute('aria-expanded', 'false')
    // La barre du bas : valeur du bien, sans avoir à ouvrir quoi que ce soit.
    expect(screen.getByText(/250\s000\s€/, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter le bien' })).toBeInTheDocument()
  })

  it('ouvrir la section Aperçu montre le détail', async () => {
    ouvrir()
    await remplirLeBien()

    fireEvent.click(screen.getByRole('button', { name: /^Aperçu/ }))

    expect(screen.getByText("Coût total d'acquisition")).toBeInTheDocument()
  })

  it('la cible tactile du bouton de fermeture fait au moins 44 px (h-11 w-11)', async () => {
    ouvrir()

    const fermer = await screen.findByRole('button', { name: 'Fermer' })
    expect(fermer.className).toMatch(/h-11/)
    expect(fermer.className).toMatch(/w-11/)
  })
})
