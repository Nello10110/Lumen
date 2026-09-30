import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ApercuSuppressionCompte, FoyerResume } from '../api/types'
import { useAuth } from '../hooks/useAuth'
import { DangerButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Field, Input } from './Field'
import Modale from './Modale'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

function nomFoyer(foyer: Pick<FoyerResume, 'nom'>): string {
  return foyer.nom ?? t('selecteurFoyer.sansNom')
}

/** Suppression de SON PROPRE compte (backlog § BK.2c) : accessible à tout compte connecté
 * (menu du compte) et depuis l'écran « aucun foyer » — un seul composant pour les deux, et
 * la seule façon de supprimer un compte (avec l'opérateur, lot BK.2d).
 *
 * L'aperçu vient du serveur : les foyers qui disparaissent avec le compte (dont il est le
 * seul compte et propriétaire), ceux qu'il ne fait que quitter, et ceux qui BLOQUENT — un
 * foyer dont il est propriétaire et qui compte d'autres comptes. Tant qu'il y en a un, la
 * suppression est refusée (409) : il faut d'abord transférer la propriété, ou supprimer ce
 * foyer, et la fenêtre ne propose alors aucune confirmation, seulement l'explication.
 *
 * Confirmation par saisie du nom d'utilisateur. Le compte n'existe plus ensuite, ni ses
 * sessions : `logout` n'a plus qu'à effacer le jeton local, et l'application retombe sur
 * l'écran de connexion. */
export default function SupprimerCompteModale({ onClose }: { onClose: () => void }) {
  const { logout } = useAuth()
  const [apercu, setApercu] = useState<ApercuSuppressionCompte | null>(null)
  const [erreurApercu, setErreurApercu] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    api
      .apercuSuppressionCompte()
      .then(setApercu)
      .catch((err: Error) => setErreurApercu(err.message))
  }, [])

  const bloque = apercu !== null && !apercu.peut_supprimer
  const pret = apercu !== null && apercu.peut_supprimer && confirmation.trim() === apercu.confirmation_attendue

  async function supprimer(e: React.FormEvent) {
    e.preventDefault()
    if (!pret) return
    setEnCours(true)
    setErreur(null)
    try {
      await api.supprimerMonCompte(confirmation.trim())
      logout()
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  return (
    <Modale onClose={onClose}>
      {({ titleId }) => (
        <form onSubmit={supprimer} className="space-y-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {t('supprimerCompte.titre')}
          </h2>

          {erreurApercu && <EtatErreur message={erreurApercu} />}
          {!apercu && !erreurApercu && <SkeletonTexte />}

          {bloque && (
            <section className="space-y-2 text-sm text-ink2">
              <p>{t('supprimerCompte.bloqueIntro', { n: apercu.foyers_bloquants.length })}</p>
              <ul className="list-disc space-y-1 pl-5">
                {apercu.foyers_bloquants.map((f) => (
                  <li key={f.id}>
                    <span className="font-medium text-ink">{nomFoyer(f)}</span>
                    {' · '}
                    {t('supprimerCompte.autresComptes', { n: f.autres_comptes })}
                  </li>
                ))}
              </ul>
              <p>{t('supprimerCompte.bloqueSolution')}</p>
            </section>
          )}

          {apercu && !bloque && (
            <>
              <p className="text-sm text-ink2">{t('supprimerCompte.explication')}</p>
              {apercu.foyers_supprimes.length > 0 && (
                <section className="space-y-1.5 text-sm text-ink2">
                  <p>{t('supprimerCompte.foyersSupprimes', { n: apercu.foyers_supprimes.length })}</p>
                  <ul className="list-disc pl-5">
                    {apercu.foyers_supprimes.map((f) => (
                      <li key={f.id} className="font-medium text-ink">
                        {nomFoyer(f)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {apercu.foyers_quittes.length > 0 && (
                <section className="space-y-1.5 text-sm text-ink2">
                  <p>{t('supprimerCompte.foyersQuittes', { n: apercu.foyers_quittes.length })}</p>
                  <ul className="list-disc pl-5">
                    {apercu.foyers_quittes.map((f) => (
                      <li key={f.id} className="font-medium text-ink">
                        {nomFoyer(f)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <p className="text-sm text-negatif">{t('supprimerCompte.irreversible')}</p>
              <Field label={t('supprimerCompte.confirmationLabel', { nom: apercu.confirmation_attendue })}>
                <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" spellCheck={false} />
              </Field>
            </>
          )}

          {erreur && <EtatErreur message={erreur} />}
          <div className="flex justify-end gap-2.5">
            <SecondaryButton onClick={onClose} disabled={enCours}>
              {bloque ? t('supprimerCompte.fermer') : t('supprimerCompte.annuler')}
            </SecondaryButton>
            {!bloque && (
              <DangerButton type="submit" disabled={enCours || !pret}>
                {t('supprimerCompte.supprimer')}
              </DangerButton>
            )}
          </div>
        </form>
      )}
    </Modale>
  )
}
