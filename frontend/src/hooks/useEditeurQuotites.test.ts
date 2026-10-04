import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { TOLERANCE_SOMME_PCT } from '../utils/repartitionMembres'
import { useEditeurQuotites } from './useEditeurQuotites'

vi.mock('../api/client', () => ({ api: { listDetenteurs: vi.fn() } }))

const HORODATAGE = '2026-01-01T00:00:00'
const DETENTEURS = [
  { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE },
  { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE },
]

describe('useEditeurQuotites', () => {
  beforeEach(() => {
    vi.mocked(api.listDetenteurs).mockResolvedValue(DETENTEURS)
  })

  it('distingue un échec de chargement d’une absence de détenteur', async () => {
    // Régression du 03/09/2026 : les trois éditeurs faisaient
    // `.catch(() => setDetenteurs([]))` puis s'effaçaient si la liste était vide.
    // Un GET en échec faisait donc DISPARAÎTRE le bloc de répartition, sans
    // message ni bouton Réessayer — indiscernable de « aucun détenteur déclaré ».
    vi.mocked(api.listDetenteurs).mockRejectedValue(new Error('réseau injoignable'))
    const { result } = renderHook(() => useEditeurQuotites({ enregistrer: vi.fn() }))

    await waitFor(() => expect(result.current.erreurChargement).toBe('réseau injoignable'))
    expect(result.current.detenteurs).toEqual([])
  })

  it('valide la somme des quotités à 100 % avec la tolérance partagée', async () => {
    const { result } = renderHook(() => useEditeurQuotites({ enregistrer: vi.fn() }))
    await waitFor(() => expect(result.current.detenteurs).toHaveLength(2))

    // Formulaire vierge : rien à valider, l'enregistrement reste possible.
    expect(result.current.totalValide).toBe(true)

    act(() => result.current.setSaisie({ 1: '60' }))
    await waitFor(() => expect(result.current.totalValide).toBe(false))

    act(() => result.current.setSaisie({ 1: '60', 2: '40' }))
    await waitFor(() => expect(result.current.totalValide).toBe(true))
  })

  it('n’envoie que les quotités strictement positives', async () => {
    const enregistrer = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useEditeurQuotites({ enregistrer }))
    await waitFor(() => expect(result.current.detenteurs).toHaveLength(2))

    act(() => result.current.setSaisie({ 1: '100', 2: '0' }))
    await act(async () => { await result.current.handleSave() })

    expect(enregistrer).toHaveBeenCalledWith([{ detenteur_id: 1, quotite_pct: 100 }])
    expect(result.current.enregistre).toBe(true)
  })

  it('expose une tolérance unique, partagée par les trois éditeurs', () => {
    // Elle vivait en trois exemplaires et avait déjà divergé (littéral en dur dans
    // `DetenteursSection`). Ce test verrouille l'unicité de la règle.
    expect(TOLERANCE_SOMME_PCT).toBe(0.01)
  })

  describe('pré-remplissage (§ BN.1, lot 2)', () => {
    it('reprend les valeurs initiales déjà en main (fiche d’un actif)', async () => {
      const { result } = renderHook(() =>
        useEditeurQuotites({
          enregistrer: vi.fn(),
          valeursInitiales: [
            { detenteur_id: 1, quotite_pct: 70 },
            { detenteur_id: 2, quotite_pct: 30 },
          ],
        }),
      )

      await waitFor(() => expect(result.current.saisie).toEqual({ 1: '70', 2: '30' }))
      expect(result.current.source).toBe('enregistree')
    })

    it('va chercher les valeurs actuelles quand on lui donne un chargeur (compte, prêt)', async () => {
      const chargerValeursInitiales = vi.fn().mockResolvedValue({ quotites: [{ detenteur_id: 1, quotite_pct: 100 }] })
      const { result } = renderHook(() => useEditeurQuotites({ enregistrer: vi.fn(), chargerValeursInitiales }))

      await waitFor(() => expect(result.current.saisie).toEqual({ 1: '100' }))
      expect(result.current.source).toBe('enregistree')
    })

    it('propose des parts égales — sans rien enregistrer — quand rien n’est enregistré', async () => {
      const enregistrer = vi.fn()
      const { result } = renderHook(() =>
        useEditeurQuotites({ enregistrer, valeursInitiales: [], proposerParDefaut: true }),
      )

      await waitFor(() => expect(result.current.saisie).toEqual({ 1: '50', 2: '50' }))
      expect(result.current.source).toBe('proposee')
      expect(enregistrer).not.toHaveBeenCalled()
    })

    it('ne propose rien quand les lignes d’un compte divergent, et le signale', async () => {
      const chargerValeursInitiales = vi.fn().mockResolvedValue({ quotites: [], divergente: true })
      const { result } = renderHook(() =>
        useEditeurQuotites({ enregistrer: vi.fn(), chargerValeursInitiales, proposerParDefaut: true }),
      )

      await waitFor(() => expect(result.current.source).toBe('divergente'))
      expect(result.current.saisie).toEqual({})
    })

    it('un échec de lecture des parts actuelles n’est pas une erreur d’écran : le formulaire reste utilisable', async () => {
      const chargerValeursInitiales = vi.fn().mockRejectedValue(new Error('403'))
      const { result } = renderHook(() =>
        useEditeurQuotites({ enregistrer: vi.fn(), chargerValeursInitiales, proposerParDefaut: true }),
      )

      await waitFor(() => expect(result.current.detenteurs).toHaveLength(2))
      expect(result.current.erreurChargement).toBeNull()
      expect(result.current.source).toBe('proposee')
    })

    it('retire « Enregistré » dès que les parts changent', async () => {
      const enregistrer = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() => useEditeurQuotites({ enregistrer, proposerParDefaut: true }))
      await waitFor(() => expect(result.current.detenteurs).toHaveLength(2))

      await act(async () => { await result.current.handleSave() })
      expect(result.current.enregistre).toBe(true)

      act(() => result.current.setSaisie({ 1: '60', 2: '40' }))
      expect(result.current.enregistre).toBe(false)
    })
  })
})
