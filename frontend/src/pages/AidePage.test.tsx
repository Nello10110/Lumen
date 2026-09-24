import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { activerLangue } from '../i18n'
import AidePage from './AidePage'

vi.mock('../api/client', () => ({
  api: {
    getZonesGeographiques: vi.fn(),
  },
}))

const ZONES = [
  { zone: 'Amérique du Nord', pays: ['Canada', 'États-Unis'], codes_pays: ['CA', 'US'] },
  { zone: 'Europe', pays: ['Allemagne', 'France'], codes_pays: ['DE', 'FR'] },
  { zone: 'Japon', pays: ['Japon'], codes_pays: ['JP'] },
  { zone: 'Asie-Pacifique (hors Japon)', pays: ['Australie'], codes_pays: ['AU'] },
  { zone: 'Marchés émergents', pays: ['Chine', 'Inde'], codes_pays: ['CN', 'IN'] },
  { zone: 'Autres zones', pays: [], codes_pays: [] },
]

describe('AidePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche les 6 zones géographiques renvoyées par l’API, pays inclus', async () => {
    vi.mocked(api.getZonesGeographiques).mockResolvedValue(ZONES)
    render(<AidePage />)

    await screen.findByText('Amérique du Nord')
    expect(screen.getByText('États-Unis')).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByText('Inde')).toBeInTheDocument()
    // "Autres zones" n'a pas de liste fixe : un texte explicatif à la place
    // (cette phrase précise n'apparaît que dans la carte de zone, contrairement à
    // "catégorie résiduelle" seul qui est repris ailleurs dans la FAQ).
    expect(screen.getByText(/Pas de liste fixe/)).toBeInTheDocument()
  })

  it('affiche un message d’erreur si la récupération des zones échoue', async () => {
    vi.mocked(api.getZonesGeographiques).mockRejectedValue(new Error('Panne réseau simulée'))
    render(<AidePage />)

    await screen.findByText('Panne réseau simulée')
  })

  it('Réessayer relance getZonesGeographiques (backlog 2.K.5)', async () => {
    vi.mocked(api.getZonesGeographiques).mockRejectedValueOnce(new Error('Panne réseau simulée'))
    render(<AidePage />)
    await screen.findByText('Panne réseau simulée')

    vi.mocked(api.getZonesGeographiques).mockResolvedValueOnce(ZONES)
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }))

    await screen.findByText('Amérique du Nord')
    expect(api.getZonesGeographiques).toHaveBeenCalledTimes(2)
  })

  it('affiche les 11 secteurs (contenu statique, indépendant de l’API)', async () => {
    vi.mocked(api.getZonesGeographiques).mockResolvedValue(ZONES)
    render(<AidePage />)

    expect(screen.getByText("Technologies de l'information")).toBeInTheDocument()
    expect(screen.getByText('Immobilier')).toBeInTheDocument()
  })

  it('affiche les entrées glossaire ajoutées au backlog § AZ.3', async () => {
    vi.mocked(api.getZonesGeographiques).mockResolvedValue(ZONES)
    render(<AidePage />)

    expect(screen.getByText('Quotité')).toBeInTheDocument()
    expect(screen.getByText('Capital restant dû')).toBeInTheDocument()
    expect(screen.getByText('Rentabilité brute / nette')).toBeInTheDocument()
    expect(screen.getByText('XIRR (rendement annualisé)')).toBeInTheDocument()
    expect(screen.getByText('Look-through')).toBeInTheDocument()
  })

  it('le contenu des questions repliables n’apparaît qu’après un clic (accordéon natif)', async () => {
    vi.mocked(api.getZonesGeographiques).mockResolvedValue(ZONES)
    render(<AidePage />)

    // "look-through" apparaît aussi bien dans la question que dans sa réponse :
    // matcher restreint au <summary> pour ne cibler que la question.
    const question = screen.getByText(
      (content, element) => element?.tagName.toLowerCase() === 'summary' && content.includes('look-through'),
    )
    // Le texte de la réponse est déjà présent dans le DOM (élément <details> natif),
    // simplement masqué tant que l'utilisateur n'a pas cliqué sur la question.
    const details = question.closest('details')
    expect(details).not.toBeNull()
    expect(details).not.toHaveAttribute('open')

    fireEvent.click(question)
    expect(details).toHaveAttribute('open')
  })

  it('en anglais, nomme zones, secteurs et pays dans la langue du foyer (§ BL)', async () => {
    // Les pays viennent de leur code ISO (`Intl.DisplayNames`) : sans cela, un foyer
    // anglophone lirait « Allemagne » et « États-Unis » au milieu d'un écran anglais.
    await activerLangue('en')
    try {
      vi.mocked(api.getZonesGeographiques).mockResolvedValue(ZONES)
      render(<AidePage />)

      await screen.findByText('North America')
      expect(screen.getByText('United States')).toBeInTheDocument()
      expect(screen.getByText('Germany')).toBeInTheDocument()
      expect(screen.queryByText('Allemagne')).not.toBeInTheDocument()
      expect(screen.getByText('Information technology')).toBeInTheDocument()
    } finally {
      await activerLangue('fr')
    }
  })
})
