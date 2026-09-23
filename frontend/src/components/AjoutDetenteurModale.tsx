import { useState } from 'react'
import { api } from '../api/client'
import type { Detenteur } from '../api/types'
import { PrimaryButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Field, Input } from './Field'
import Modale from './Modale'
import { t } from '../i18n'

/** Petite pop-up « juste le nom » (retour utilisateur du 09/09/2026, écran Salaire :
 * pouvoir ajouter une personne du foyer sans quitter le formulaire en cours). `onCree`
 * reçoit le détenteur fraîchement créé pour que l'appelant le sélectionne
 * immédiatement. */
export default function AjoutDetenteurModale({ onClose, onCree }: { onClose: () => void; onCree: (detenteur: Detenteur) => void }) {
  const [nom, setNom] = useState('')
  const [creation, setCreation] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  function ajouter() {
    const nomTrim = nom.trim()
    if (!nomTrim) return
    setCreation(true)
    setErreur(null)
    api
      .createDetenteur(nomTrim)
      .then((detenteur) => onCree(detenteur))
      .catch((err) => setErreur((err as Error).message))
      .finally(() => setCreation(false))
  }

  return (
    <Modale onClose={onClose} panelClassName="w-full max-w-sm rounded-panel border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass p-6">
      {({ titleId }) => (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ajouter()
          }}
        >
          <h2 id={titleId} className="mb-4 text-lg font-semibold text-texte">{t('ajoutDetenteurModale.nouvellePersonneDuFoyer')}</h2>
          <Field label={t('ajoutDetenteurModale.nom')}>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={t('ajoutDetenteurModale.exJulie')} autoFocus />
          </Field>
          {erreur && <EtatErreur message={erreur} />}
          <div className="mt-4 flex justify-end gap-2">
            <SecondaryButton type="button" onClick={onClose}>{t('ajoutDetenteurModale.annuler')}</SecondaryButton>
            <PrimaryButton type="submit" disabled={creation || !nom.trim()}>
              {creation ? t('ajoutDetenteurModale.ajout') : t('ajoutDetenteurModale.ajouter')}
            </PrimaryButton>
          </div>
        </form>
      )}
    </Modale>
  )
}
