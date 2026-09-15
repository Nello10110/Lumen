import { afterEach, describe, expect, it, vi } from 'vitest'
import { armerFlashConnexion, consommerFlashConnexion } from './flashConnexion'

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('flashConnexion (backlog § AH.1)', () => {
  it("n'est pas armé par défaut", () => {
    expect(consommerFlashConnexion()).toBe(false)
  })

  it('armerFlashConnexion() puis consommerFlashConnexion() renvoie vrai une fois', () => {
    armerFlashConnexion()

    expect(consommerFlashConnexion()).toBe(true)
    // Consommé : un second appel ne doit plus jamais renvoyer vrai pour le même armement.
    expect(consommerFlashConnexion()).toBe(false)
  })

  it('utilise sessionStorage, pas localStorage — ne doit jamais survivre à un nouvel onglet', () => {
    armerFlashConnexion()

    expect(sessionStorage.getItem('patrimoine:flash-connexion')).toBe('1')
    expect(localStorage.getItem('patrimoine:flash-connexion')).toBeNull()
  })

  it('silencieux si sessionStorage lève (fenêtre privée, données de site bloquées)', () => {
    const espion = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('accès refusé')
    })

    expect(() => armerFlashConnexion()).not.toThrow()

    espion.mockRestore()
    const espionGet = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('accès refusé')
    })

    expect(consommerFlashConnexion()).toBe(false)
    espionGet.mockRestore()
  })
})
