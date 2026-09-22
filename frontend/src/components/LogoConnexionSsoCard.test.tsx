import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import LogoConnexionSsoCard from './LogoConnexionSsoCard'

vi.mock('../api/client', () => ({
  api: {
    getLogoConnexionSso: vi.fn(),
    setLogoConnexionSsoUrl: vi.fn(),
    uploadLogoConnexionSso: vi.fn(),
    deleteLogoConnexionSso: vi.fn(),
  },
}))

const LOGO = 'data:image/png;base64,AAA'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.getLogoConnexionSso).mockResolvedValue({ logo: null })
})

function champFichier(): HTMLInputElement {
  return screen.getByLabelText('Image du logo de connexion SSO') as HTMLInputElement
}

describe('LogoConnexionSsoCard (retour utilisateur du 22/09/2026)', () => {
  it("dit explicitement qu'aucun logo n'est posé, au lieu d'un emplacement vide", async () => {
    render(<LogoConnexionSsoCard />)

    expect(await screen.findByText('Aucun')).toBeInTheDocument()
    expect(screen.getByText(/le bouton n'affiche que son libellé/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retirer le logo' })).not.toBeInTheDocument()
  })

  it('affiche le logo déjà posé au chargement', async () => {
    vi.mocked(api.getLogoConnexionSso).mockResolvedValue({ logo: LOGO })
    render(<LogoConnexionSsoCard />)

    await waitFor(() =>
      expect(screen.getByAltText('Logo actuel du bouton de connexion SSO')).toHaveAttribute('src', LOGO),
    )
  })

  it("un téléversement met l'aperçu à jour sans recharger la page", async () => {
    vi.mocked(api.uploadLogoConnexionSso).mockResolvedValue({ logo: LOGO })
    render(<LogoConnexionSsoCard />)
    await screen.findByText('Aucun')

    const fichier = new File(['x'], 'logo.png', { type: 'image/png' })
    fireEvent.change(champFichier(), { target: { files: [fichier] } })

    await waitFor(() => expect(screen.getByAltText('Logo actuel du bouton de connexion SSO')).toBeInTheDocument())
    expect(api.uploadLogoConnexionSso).toHaveBeenCalledWith(fichier)
  })

  it("une adresse est transmise au serveur, qui va chercher l'image", async () => {
    vi.mocked(api.setLogoConnexionSsoUrl).mockResolvedValue({ logo: LOGO })
    render(<LogoConnexionSsoCard />)
    await screen.findByText('Aucun')

    fireEvent.change(screen.getByLabelText(/Adresse d'une image/), {
      target: { value: '  https://sso.exemple.fr/logo.png  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser cette adresse' }))

    // Espaces retirés : une adresse collée en traîne souvent.
    await waitFor(() => expect(api.setLogoConnexionSsoUrl).toHaveBeenCalledWith('https://sso.exemple.fr/logo.png'))
  })

  it('le retrait ramène la carte à son état sans logo', async () => {
    vi.mocked(api.getLogoConnexionSso).mockResolvedValue({ logo: LOGO })
    vi.mocked(api.deleteLogoConnexionSso).mockResolvedValue({ logo: null })
    render(<LogoConnexionSsoCard />)

    fireEvent.click(await screen.findByRole('button', { name: 'Retirer le logo' }))

    await screen.findByText('Aucun')
    expect(screen.queryByAltText('Logo actuel du bouton de connexion SSO')).not.toBeInTheDocument()
  })

  it("affiche l'erreur du serveur telle quelle et garde le logo en place", async () => {
    vi.mocked(api.getLogoConnexionSso).mockResolvedValue({ logo: LOGO })
    vi.mocked(api.uploadLogoConnexionSso).mockRejectedValue(new Error('Fichier illisible : ce n\'est pas une image.'))
    render(<LogoConnexionSsoCard />)
    await screen.findByAltText('Logo actuel du bouton de connexion SSO')

    fireEvent.change(champFichier(), { target: { files: [new File(['x'], 'doc.pdf')] } })

    expect(await screen.findByText("Fichier illisible : ce n'est pas une image.")).toBeInTheDocument()
    expect(screen.getByAltText('Logo actuel du bouton de connexion SSO')).toBeInTheDocument()
  })

  it("rappelle que le reste de la configuration SSO ne se règle pas ici", async () => {
    render(<LogoConnexionSsoCard />)

    expect(await screen.findByText(/se règle par variables d'environnement, pas ici/)).toBeInTheDocument()
  })
})
