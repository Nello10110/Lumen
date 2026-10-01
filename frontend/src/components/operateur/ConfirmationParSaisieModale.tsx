import { useState } from 'react'
import { DangerButton, SecondaryButton } from '../Controls'
import EtatErreur from '../EtatErreur'
import { Field, Input } from '../Field'
import Modale from '../Modale'
import { t } from '../../i18n'

/** Confirmation d'une suppression irréversible de la console de l'opérateur (backlog § BK.2d),
 * par saisie de `phrase` — le nom du foyer (`confirmation_attendue`), ou le nom d'utilisateur du
 * compte : le bouton reste fermé tant que la saisie n'est pas exacte, et le serveur la vérifie
 * aussi. Un seul gabarit pour les deux suppressions, qui n'ont que leur texte en propre.
 *
 * `onConfirmer` renvoie une promesse : en cas d'échec, le message du serveur s'affiche ici et la
 * fenêtre reste ouverte ; en cas de réussite, c'est l'appelant qui la ferme. */
export default function ConfirmationParSaisieModale({
  titre,
  explication,
  phrase,
  libelleBouton,
  onConfirmer,
  onClose,
}: {
  titre: string
  explication: string
  phrase: string
  libelleBouton: string
  onConfirmer: (confirmation: string) => Promise<void>
  onClose: () => void
}) {
  const [saisie, setSaisie] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const pret = saisie.trim() === phrase

  async function confirmer(e: React.FormEvent) {
    e.preventDefault()
    if (!pret) return
    setEnCours(true)
    setErreur(null)
    try {
      await onConfirmer(saisie.trim())
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  return (
    <Modale onClose={onClose}>
      {({ titleId }) => (
        <form onSubmit={confirmer} className="space-y-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {titre}
          </h2>
          <p className="text-sm text-ink2">{explication}</p>
          <p className="text-sm text-negatif">{t('confirmationParSaisie.irreversible')}</p>
          <Field label={t('confirmationParSaisie.confirmationLabel', { phrase })}>
            <Input
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              aria-label={t('confirmationParSaisie.confirmationAria')}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          {erreur && <EtatErreur message={erreur} />}
          <div className="flex justify-end gap-2.5">
            <SecondaryButton onClick={onClose} disabled={enCours}>
              {t('confirmationParSaisie.annuler')}
            </SecondaryButton>
            <DangerButton type="submit" disabled={enCours || !pret}>
              {libelleBouton}
            </DangerButton>
          </div>
        </form>
      )}
    </Modale>
  )
}
