import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRegisterSW } from 'virtual:pwa-register/react'
import MiseAJourDisponible from './MiseAJourDisponible'

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: vi.fn() }))

function mockHook(needRefresh: boolean) {
  const updateServiceWorker = vi.fn()
  const setNeedRefresh = vi.fn()
  vi.mocked(useRegisterSW).mockReturnValue({
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  })
  return { updateServiceWorker, setNeedRefresh }
}

/** `sw.js` tel que le serveur le sert : son contenu identifie la version en attente. */
function serveSw(contenu: string | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => {
      if (contenu === null) throw new TypeError('Failed to fetch')
      return { ok: true, text: async () => contenu } as Response
    }),
  )
}

let naviguer: (chemin: string) => void = () => {}
function Navigation() {
  const navigate = useNavigate()
  naviguer = navigate
  return null
}

function monter() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Navigation />
      <MiseAJourDisponible />
      <input aria-label="Montant" />
    </MemoryRouter>,
  )
}

async function laisserLireLaVersion() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function saisir() {
  fireEvent.input(screen.getByLabelText('Montant'), { target: { value: '1200' } })
}

function masquerLOnglet() {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('MiseAJourDisponible', () => {
  beforeEach(() => {
    // Les appels des tests précédents appartiennent à des composants démontés : lire
    // `mock.calls[0]` sans cela renverrait les options d'un autre rendu.
    vi.mocked(useRegisterSW).mockClear()
    sessionStorage.clear()
    serveSw('sw-version-1')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    Reflect.deleteProperty(document, 'hidden')
    document.querySelectorAll('[role="dialog"]').forEach((n) => n.remove())
  })

  it("n'affiche rien et ne recharge rien tant qu'aucune nouvelle version n'est détectée", async () => {
    const { updateServiceWorker } = mockHook(false)

    monter()
    masquerLOnglet()
    await laisserLireLaVersion()

    expect(screen.queryByText(/mise à jour/i)).not.toBeInTheDocument()
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  describe('rien à perdre', () => {
    it("n'interrompt pas l'utilisateur : ni bannière, ni rechargement tant que l'onglet est visible et l'écran inchangé", async () => {
      const { updateServiceWorker } = mockHook(true)

      monter()
      await laisserLireLaVersion()

      expect(screen.queryByText('Une mise à jour est prête.')).not.toBeInTheDocument()
      expect(updateServiceWorker).not.toHaveBeenCalled()
    })

    it("actualise en silence quand l'onglet passe en arrière-plan", async () => {
      const { updateServiceWorker } = mockHook(true)

      monter()
      await laisserLireLaVersion()
      masquerLOnglet()

      expect(updateServiceWorker).toHaveBeenCalledTimes(1)
      expect(updateServiceWorker).toHaveBeenCalledWith(true)
      expect(screen.queryByText('Une mise à jour est prête.')).not.toBeInTheDocument()
    })

    it("actualise en silence à la prochaine navigation d'écran", async () => {
      const { updateServiceWorker } = mockHook(true)

      monter()
      await laisserLireLaVersion()
      act(() => naviguer('/patrimoine'))

      expect(updateServiceWorker).toHaveBeenCalledTimes(1)
      expect(updateServiceWorker).toHaveBeenCalledWith(true)
    })

    it('ne recharge qu\'une fois, même si l\'onglet est masqué plusieurs fois', async () => {
      const { updateServiceWorker } = mockHook(true)

      monter()
      await laisserLireLaVersion()
      masquerLOnglet()
      masquerLOnglet()
      act(() => naviguer('/budget'))

      expect(updateServiceWorker).toHaveBeenCalledTimes(1)
    })

    it('ne boucle pas : une version déjà actualisée en silence passe par la bannière la fois suivante', async () => {
      const premier = mockHook(true)
      const { unmount } = monter()
      await laisserLireLaVersion()
      masquerLOnglet()
      expect(premier.updateServiceWorker).toHaveBeenCalledTimes(1)
      unmount()

      // La page rechargée retrouve la MÊME version en attente (l'activation a échoué) :
      // pas de second rechargement silencieux, la bannière laisse la main.
      Reflect.deleteProperty(document, 'hidden')
      const second = mockHook(true)
      monter()
      await laisserLireLaVersion()

      expect(await screen.findByText('Une mise à jour est prête.')).toBeInTheDocument()
      masquerLOnglet()
      expect(second.updateServiceWorker).not.toHaveBeenCalled()
    })
  })

  describe('saisie en cours', () => {
    it("un champ modifié avant l'arrivée de la mise à jour : bannière discrète, aucun rechargement", async () => {
      const { updateServiceWorker } = mockHook(false)
      const { rerender } = monter()
      saisir()

      mockHook(true)
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <Navigation />
          <MiseAJourDisponible />
          <input aria-label="Montant" />
        </MemoryRouter>,
      )
      await laisserLireLaVersion()

      expect(await screen.findByText('Une mise à jour est prête.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Actualiser' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Plus tard' })).toBeInTheDocument()
      expect(updateServiceWorker).not.toHaveBeenCalled()
    })

    it("un champ modifié APRÈS l'arrivée de la mise à jour : l'onglet masqué n'actualise plus en silence, la bannière attend", async () => {
      const { updateServiceWorker } = mockHook(true)

      monter()
      await laisserLireLaVersion()
      saisir()
      masquerLOnglet()

      expect(updateServiceWorker).not.toHaveBeenCalled()
      expect(await screen.findByText('Une mise à jour est prête.')).toBeInTheDocument()
    })

    it("une modale ouverte compte comme une saisie : bannière, pas de rechargement", async () => {
      const { updateServiceWorker } = mockHook(true)
      const modale = document.createElement('div')
      modale.setAttribute('role', 'dialog')
      document.body.appendChild(modale)

      monter()
      await laisserLireLaVersion()

      expect(await screen.findByText('Une mise à jour est prête.')).toBeInTheDocument()
      expect(updateServiceWorker).not.toHaveBeenCalled()
    })

    it('un formulaire envoyé remet le compteur à zéro', async () => {
      const { updateServiceWorker } = mockHook(true)

      const { container } = monter()
      await laisserLireLaVersion()
      saisir()
      fireEvent.submit(container.appendChild(document.createElement('form')))
      masquerLOnglet()

      expect(updateServiceWorker).toHaveBeenCalledTimes(1)
    })

    it('« Actualiser » recharge', async () => {
      const { updateServiceWorker } = mockHook(true)
      monter()
      saisir()
      await laisserLireLaVersion()

      fireEvent.click(await screen.findByRole('button', { name: 'Actualiser' }))

      expect(updateServiceWorker).toHaveBeenCalledWith(true)
    })
  })

  describe('« Plus tard » mémorisé par version', () => {
    // Un champ modifié AVANT la fin de la lecture de la version : la mise à jour passe par la bannière.
    async function monterAvecBanniere() {
      const monte = monter()
      saisir()
      await laisserLireLaVersion()
      return monte
    }

    it('masque la bannière sans recharger', async () => {
      const { updateServiceWorker, setNeedRefresh } = mockHook(true)
      await monterAvecBanniere()

      fireEvent.click(await screen.findByRole('button', { name: 'Plus tard' }))

      expect(setNeedRefresh).toHaveBeenCalledWith(false)
      expect(updateServiceWorker).not.toHaveBeenCalled()
      expect(screen.queryByText('Une mise à jour est prête.')).not.toBeInTheDocument()
    })

    it("la bannière ne revient pas, ni le rechargement silencieux, pour la même version (rechargement de page, nouvel écran)", async () => {
      mockHook(true)
      const premier = await monterAvecBanniere()
      fireEvent.click(await screen.findByRole('button', { name: 'Plus tard' }))
      premier.unmount()

      // Même onglet (sessionStorage), même `sw.js` en attente : rien ne s'affiche.
      const { updateServiceWorker } = mockHook(true)
      monter()
      saisir()
      await laisserLireLaVersion()
      masquerLOnglet()
      act(() => naviguer('/budget'))

      expect(screen.queryByText('Une mise à jour est prête.')).not.toBeInTheDocument()
      expect(updateServiceWorker).not.toHaveBeenCalled()
    })

    it('réapparaît pour la version suivante', async () => {
      mockHook(true)
      const premier = await monterAvecBanniere()
      fireEvent.click(await screen.findByRole('button', { name: 'Plus tard' }))
      premier.unmount()

      serveSw('sw-version-2')
      mockHook(true)
      await monterAvecBanniere()

      expect(await screen.findByText('Une mise à jour est prête.')).toBeInTheDocument()
    })
  })

  it("version illisible (réseau coupé) : jamais de rechargement silencieux, la bannière laisse la main", async () => {
    serveSw(null)
    const { updateServiceWorker } = mockHook(true)

    monter()
    await laisserLireLaVersion()
    masquerLOnglet()

    expect(await screen.findByText('Une mise à jour est prête.')).toBeInTheDocument()
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  describe('vérification périodique', () => {
    it("vérifie immédiatement une mise à jour dès l'enregistrement, puis toutes les heures (retour utilisateur du 10/09/2026 — idle prolongé)", async () => {
      vi.useFakeTimers()
      mockHook(false)
      monter()

      const options = vi.mocked(useRegisterSW).mock.calls[0][0]
      const registration = { update: vi.fn() } as unknown as ServiceWorkerRegistration
      options?.onRegisteredSW?.('/sw.js', registration)

      expect(registration.update).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(registration.update).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(registration.update).toHaveBeenCalledTimes(3)
    })

    it("nettoie l'intervalle quand le composant disparaît", async () => {
      vi.useFakeTimers()
      mockHook(false)
      const { unmount } = monter()
      const options = vi.mocked(useRegisterSW).mock.calls[0][0]
      const registration = { update: vi.fn() } as unknown as ServiceWorkerRegistration
      options?.onRegisteredSW?.('/sw.js', registration)
      expect(registration.update).toHaveBeenCalledTimes(1)

      unmount()
      await vi.advanceTimersByTimeAsync(5 * 60 * 60 * 1000)

      expect(registration.update).toHaveBeenCalledTimes(1)
    })

    it("un second enregistrement remplace l'intervalle au lieu de s'y ajouter", async () => {
      vi.useFakeTimers()
      mockHook(false)
      monter()
      const options = vi.mocked(useRegisterSW).mock.calls[0][0]
      const registration = { update: vi.fn() } as unknown as ServiceWorkerRegistration
      options?.onRegisteredSW?.('/sw.js', registration)
      options?.onRegisteredSW?.('/sw.js', registration)
      expect(registration.update).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)

      expect(registration.update).toHaveBeenCalledTimes(3)
    })
  })

  it("reste cohérent après démontage pendant la lecture de la version (pas d'état mis à jour sur un composant démonté)", async () => {
    const { updateServiceWorker } = mockHook(true)
    const { unmount } = monter()
    unmount()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await laisserLireLaVersion()

    expect(updateServiceWorker).not.toHaveBeenCalled()
  })
})
