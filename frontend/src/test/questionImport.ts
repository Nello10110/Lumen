import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import type { AuthUser, Detenteur, QuotiteEntree } from '../api/types'
import { AuthContext, type AuthContextValue } from '../contexts/authContextObject'

/** Suite de tests commune aux quatre imports de patrimoine (Trade Republic, Ledger, Bricks.co, relevé
 * de positions) pour la question « À quel membre appartiennent ces lignes ? » (§ BN.1, lot 3). Chaque
 * fichier de test fournit seulement la façon de rendre SA section et de la mener jusqu'au bouton
 * « Confirmer l'import » ; les règles verrouillées sont, elles, les mêmes partout. */

const HORODATAGE = '2026-01-01T00:00:00'
const ALICE: Detenteur = { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE }
const BOB: Detenteur = { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE }

const TITRE_QUESTION = 'À quel membre appartiennent ces lignes ?'
const CLE_FOYER = (foyerId: number) => `lumen:repartition-import:${foyerId}`

export interface BancImport {
  /** Rend la section DANS le contexte fourni, dépose un fichier et remplit tout ce qu'il faut pour que
   * « Confirmer l'import » ne soit désactivé que par la question des membres. Résout quand le bouton existe. */
  ouvrir: (enveloppe: (contenu: ReactElement) => ReactElement) => Promise<void>
  /** La fonction `api.…Confirm` de cette section. */
  confirm: () => ReturnType<typeof vi.fn>
  /** Fait réussir la confirmation. */
  confirmationReussit: () => void
  /** Fait échouer la confirmation. */
  confirmationEchoue: () => void
  /** Attend que le bandeau de résultat d'un import réussi soit affiché. */
  attendreSucces: () => Promise<void>
}

/** Enveloppe de rendu : routeur (les sections naviguent) et foyer courant (clé du dernier choix). */
export function enveloppeFoyer(foyerId: number | null) {
  const valeur = {
    user: { id: 1, username: 'u', role: 'proprietaire', foyer_courant_id: foyerId } as unknown as AuthUser,
    loading: false,
  } as unknown as AuthContextValue
  return function Enveloppe(contenu: ReactElement) {
    return createElement(MemoryRouter, null, createElement(AuthContext.Provider, { value: valeur }, contenu))
  }
}

function boutonConfirmer() {
  return screen.getByRole('button', { name: "Confirmer l'import" })
}

async function laisserArriverLesMembres() {
  await waitFor(() => expect(api.listDetenteurs).toHaveBeenCalled())
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

function quotitesDuPayload(banc: BancImport): QuotiteEntree[] | undefined {
  return (banc.confirm().mock.calls[0][0] as { quotites?: QuotiteEntree[] }).quotites
}

export function suiteQuestionImport(nom: string, banc: BancImport) {
  describe(`${nom} — question « à quel membre ? » (§ BN.1, lot 3)`, () => {
    beforeEach(() => {
      localStorage.clear()
      vi.mocked(api.listDetenteurs).mockReset()
      banc.confirm().mockReset()
      vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE, BOB])
    })

    it('avec deux membres, la question s\'affiche, pré-remplie à parts égales quand aucun choix n\'est mémorisé', async () => {
      await banc.ouvrir(enveloppeFoyer(1))

      expect(await screen.findByText(TITRE_QUESTION)).toBeInTheDocument()
      expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(50)
      expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(50)
      expect(screen.queryByText(/Votre dernier choix pour ce foyer est repris/)).not.toBeInTheDocument()
    })

    it('la question est pré-remplie avec le dernier choix mémorisé du foyer, et le dit', async () => {
      localStorage.setItem(CLE_FOYER(1), JSON.stringify([{ detenteur_id: 1, quotite_pct: 70 }, { detenteur_id: 2, quotite_pct: 30 }]))
      await banc.ouvrir(enveloppeFoyer(1))

      await screen.findByText(TITRE_QUESTION)
      expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(70)
      expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(30)
      expect(screen.getByText(/Votre dernier choix pour ce foyer est repris/)).toBeInTheDocument()
    })

    it("le dernier choix d'un AUTRE foyer n'est jamais repris : parts égales", async () => {
      localStorage.setItem(CLE_FOYER(2), JSON.stringify([{ detenteur_id: 1, quotite_pct: 100 }]))
      await banc.ouvrir(enveloppeFoyer(1))

      await screen.findByText(TITRE_QUESTION)
      expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(50)
      expect(screen.queryByText(/Votre dernier choix pour ce foyer est repris/)).not.toBeInTheDocument()
    })

    it('le payload de confirmation contient `quotites` : parts égales par défaut', async () => {
      banc.confirmationReussit()
      await banc.ouvrir(enveloppeFoyer(1))
      await screen.findByText(TITRE_QUESTION)

      fireEvent.click(boutonConfirmer())

      await banc.attendreSucces()
      expect(quotitesDuPayload(banc)).toEqual([
        { detenteur_id: 1, quotite_pct: 50 },
        { detenteur_id: 2, quotite_pct: 50 },
      ])
    })

    it('le payload de confirmation porte le choix fait dans la question (100 % Bob)', async () => {
      banc.confirmationReussit()
      await banc.ouvrir(enveloppeFoyer(1))
      await screen.findByText(TITRE_QUESTION)
      fireEvent.click(screen.getByRole('button', { name: '100 % Bob' }))

      fireEvent.click(boutonConfirmer())

      await banc.attendreSucces()
      expect(quotitesDuPayload(banc)).toEqual([{ detenteur_id: 2, quotite_pct: 100 }])
    })

    it('la confirmation est bloquée tant que le total n\'est pas 100 % : bouton désactivé, message, aucun appel', async () => {
      await banc.ouvrir(enveloppeFoyer(1))
      await screen.findByText(TITRE_QUESTION)

      fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '60' } })

      expect(boutonConfirmer()).toBeDisabled()
      expect(screen.getByText('Complétez la répartition (100 %) pour importer.')).toBeInTheDocument()
      fireEvent.click(boutonConfirmer())
      expect(banc.confirm()).not.toHaveBeenCalled()

      fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '40' } })
      expect(boutonConfirmer()).toBeEnabled()
      expect(screen.queryByText('Complétez la répartition (100 %) pour importer.')).not.toBeInTheDocument()
    })

    it('le choix est mémorisé, pour CE foyer, après un import réussi', async () => {
      banc.confirmationReussit()
      await banc.ouvrir(enveloppeFoyer(4))
      await screen.findByText(TITRE_QUESTION)
      fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '25' } })
      fireEvent.change(screen.getByLabelText('Part de Bob (%)'), { target: { value: '75' } })

      fireEvent.click(boutonConfirmer())

      await banc.attendreSucces()
      expect(JSON.parse(localStorage.getItem(CLE_FOYER(4)) ?? 'null')).toEqual([
        { detenteur_id: 1, quotite_pct: 25 },
        { detenteur_id: 2, quotite_pct: 75 },
      ])
      expect(localStorage.getItem(CLE_FOYER(1))).toBeNull()
    })

    it("le choix n'est PAS mémorisé quand l'import échoue", async () => {
      banc.confirmationEchoue()
      await banc.ouvrir(enveloppeFoyer(4))
      await screen.findByText(TITRE_QUESTION)
      fireEvent.click(screen.getByRole('button', { name: '100 % Bob' }))

      fireEvent.click(boutonConfirmer())

      await waitFor(() => expect(banc.confirm()).toHaveBeenCalledTimes(1))
      await screen.findByText('Import impossible')
      expect(localStorage.getItem(CLE_FOYER(4))).toBeNull()
    })

    it('avec un seul membre : aucune question, et `quotites` est absent du payload (le serveur applique 100 % à ce membre)', async () => {
      vi.mocked(api.listDetenteurs).mockResolvedValue([ALICE])
      banc.confirmationReussit()
      await banc.ouvrir(enveloppeFoyer(1))
      await laisserArriverLesMembres()

      expect(screen.queryByText(TITRE_QUESTION)).not.toBeInTheDocument()
      fireEvent.click(boutonConfirmer())

      await banc.attendreSucces()
      expect(quotitesDuPayload(banc)).toBeUndefined()
      expect(localStorage.getItem(CLE_FOYER(1))).toBeNull()
    })

    it('sans membre dans le foyer : aucune question, `quotites` absent du payload', async () => {
      vi.mocked(api.listDetenteurs).mockResolvedValue([])
      banc.confirmationReussit()
      await banc.ouvrir(enveloppeFoyer(1))
      await laisserArriverLesMembres()

      expect(screen.queryByText(TITRE_QUESTION)).not.toBeInTheDocument()
      fireEvent.click(boutonConfirmer())

      await banc.attendreSucces()
      expect(quotitesDuPayload(banc)).toBeUndefined()
    })

    it('liste des membres illisible (403) : même comportement qu\'un foyer sans membre, l\'import reste possible', async () => {
      vi.mocked(api.listDetenteurs).mockRejectedValue(new Error('Accès refusé'))
      banc.confirmationReussit()
      await banc.ouvrir(enveloppeFoyer(1))
      await laisserArriverLesMembres()

      expect(screen.queryByText(TITRE_QUESTION)).not.toBeInTheDocument()
      expect(boutonConfirmer()).toBeEnabled()
      fireEvent.click(boutonConfirmer())

      await banc.attendreSucces()
      expect(quotitesDuPayload(banc)).toBeUndefined()
    })

    it("un membre supprimé depuis le dernier choix ne ressuscite pas dans la question : parts égales", async () => {
      localStorage.setItem(CLE_FOYER(1), JSON.stringify([{ detenteur_id: 1, quotite_pct: 50 }, { detenteur_id: 99, quotite_pct: 50 }]))
      await banc.ouvrir(enveloppeFoyer(1))

      await screen.findByText(TITRE_QUESTION)
      expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(50)
      expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(50)
      expect(screen.queryByLabelText(/Part de .*99/)).not.toBeInTheDocument()
    })
  })
}
