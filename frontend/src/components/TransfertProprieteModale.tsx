import { useState } from 'react'
import { api } from '../api/client'
import type { HouseholdMember } from '../api/types'
import { rechargerApplication } from '../auth/changementFoyer'
import { DangerButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Field, Input, Select } from './Field'
import Modale from './Modale'
import { t } from '../i18n'

/** Transfert de la propriété du foyer à un de ses MEMBRES (backlog § BK.2c). `membres` :
 * les candidats, déjà filtrés par l'appelant — un invité n'est jamais proposé, et le
 * serveur le refuserait de toute façon (400).
 *
 * Confirmation par saisie du nom d'utilisateur du destinataire, comme les autres actions
 * irréversibles. Le propriétaire devient membre : Réglages et la gestion des membres lui
 * sont fermés, il n'y a donc rien à rafraîchir sur place — un rechargement complet
 * (`rechargerApplication`) rend l'interface conforme à son nouveau rôle. Les données restent
 * au foyer, aucune n'est déplacée. */
export default function TransfertProprieteModale({ membres, onClose }: { membres: HouseholdMember[]; onClose: () => void }) {
  const [membreId, setMembreId] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const choisi = membres.find((m) => String(m.id) === membreId)
  const pret = choisi !== undefined && confirmation.trim() === choisi.username

  async function transferer(e: React.FormEvent) {
    e.preventDefault()
    if (!choisi || !pret) return
    setEnCours(true)
    setErreur(null)
    try {
      await api.transfererPropriete(choisi.id, confirmation.trim())
      rechargerApplication()
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  return (
    <Modale onClose={onClose}>
      {({ titleId }) => (
        <form onSubmit={transferer} className="space-y-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {t('transfertPropriete.titre')}
          </h2>
          <p className="text-sm text-ink2">{t('transfertPropriete.explication')}</p>
          <Field label={t('transfertPropriete.membreLabel')}>
            <Select
              value={membreId}
              onChange={(e) => {
                setMembreId(e.target.value)
                setConfirmation('')
              }}
            >
              <option value="">{t('transfertPropriete.choisir')}</option>
              {membres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom ? `${m.username} (${m.nom})` : m.username}
                </option>
              ))}
            </Select>
          </Field>
          {choisi && (
            <Field label={t('transfertPropriete.confirmationLabel', { nom: choisi.username })}>
              <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" spellCheck={false} />
            </Field>
          )}
          {erreur && <EtatErreur message={erreur} />}
          <div className="flex justify-end gap-2.5">
            <SecondaryButton onClick={onClose} disabled={enCours}>
              {t('transfertPropriete.annuler')}
            </SecondaryButton>
            <DangerButton type="submit" disabled={enCours || !pret}>
              {t('transfertPropriete.confirmer')}
            </DangerButton>
          </div>
        </form>
      )}
    </Modale>
  )
}
