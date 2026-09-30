import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ApercuSuppressionFoyer } from '../api/types'
import { rechargerApplication } from '../auth/changementFoyer'
import { telechargerExportDonnees } from '../utils/exportDonnees'
import { libelleTableDonnees } from '../utils/libelleTableDonnees'
import { DangerButton, SecondaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import { Field, Input } from './Field'
import Modale from './Modale'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

/** Suppression COMPLÈTE du foyer courant par son propriétaire (backlog § BK.2c), à côté de
 * la remise à zéro (`SauvegardeDonneesCard`) : la remise à zéro vide le foyer et le garde,
 * ici le foyer lui-même disparaît.
 *
 * Trois temps, dans cet ordre : l'aperçu de ce qui sera effacé (des nombres, lus sur le
 * serveur — jamais recalculés ici) ; la proposition d'exporter d'abord les données, seule
 * façon de les garder ; la confirmation par saisie du nom du foyer (`confirmation_attendue`,
 * ou `SUPPRIMER` tant qu'il n'en a pas), comparée aussi côté serveur.
 *
 * Aucun compte n'est supprimé : ceux dont c'était le seul foyer restent sans foyer,
 * propriétaire compris. Après la suppression, la session rouvre un autre foyer du compte s'il
 * en a un, sinon l'écran « aucun foyer » : un rechargement complet (`rechargerApplication`)
 * plutôt qu'un état à recomposer, comme pour toute bascule de foyer. */
export default function SupprimerFoyerModale({ onClose }: { onClose: () => void }) {
  const [apercu, setApercu] = useState<ApercuSuppressionFoyer | null>(null)
  const [erreurApercu, setErreurApercu] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [exportFait, setExportFait] = useState(false)

  useEffect(() => {
    api
      .apercuSuppressionFoyer()
      .then(setApercu)
      .catch((err: Error) => setErreurApercu(err.message))
  }, [])

  async function exporter() {
    setErreur(null)
    try {
      await telechargerExportDonnees()
      setExportFait(true)
    } catch (err) {
      setErreur((err as Error).message)
    }
  }

  const pret = apercu !== null && confirmation.trim() === apercu.confirmation_attendue

  async function supprimer(e: React.FormEvent) {
    e.preventDefault()
    if (!pret) return
    setEnCours(true)
    setErreur(null)
    try {
      await api.supprimerFoyer(confirmation.trim())
      rechargerApplication()
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  const lignesPatrimoine = apercu ? Object.entries(apercu.patrimoine) : []

  return (
    <Modale onClose={onClose}>
      {({ titleId }) => (
        <form onSubmit={supprimer} className="space-y-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {t('supprimerFoyer.titre')}
          </h2>

          {erreurApercu && <EtatErreur message={erreurApercu} />}
          {!apercu && !erreurApercu && <SkeletonTexte />}

          {apercu && (
            <>
              <section className="space-y-1.5 text-sm text-ink2">
                <h3 className="font-semibold text-ink">{t('supprimerFoyer.efface')}</h3>
                {lignesPatrimoine.length === 0 ? (
                  <p>{t('supprimerFoyer.aucunPatrimoine')}</p>
                ) : (
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {lignesPatrimoine.map(([table, nombre]) => (
                      <li key={table} className="flex justify-between gap-4">
                        <span className="text-ink3">{libelleTableDonnees(table)}</span>
                        <span className="font-medium tabular-nums">{nombre}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p>{t('supprimerFoyer.liensPartage', { n: apercu.liens_partage })}</p>
                <p>{t('supprimerFoyer.invitations', { n: apercu.invitations })}</p>
              </section>

              <section className="space-y-1.5 text-sm text-ink2">
                <h3 className="font-semibold text-ink">{t('supprimerFoyer.comptesTitre')}</h3>
                <p>{t('supprimerFoyer.comptesConserves', { n: apercu.comptes })}</p>
                {apercu.comptes_sans_foyer > 0 && <p>{t('supprimerFoyer.sansFoyer', { n: apercu.comptes_sans_foyer })}</p>}
                {apercu.comptes_gardant_un_foyer > 0 && (
                  <p>{t('supprimerFoyer.gardentUnFoyer', { n: apercu.comptes_gardant_un_foyer })}</p>
                )}
                <p className="text-ink3">{t('supprimerFoyer.apres')}</p>
              </section>

              <section className="space-y-2 rounded-control border border-hairline bg-chip p-3 text-sm text-ink2">
                <h3 className="font-semibold text-ink">{t('supprimerFoyer.exportTitre')}</h3>
                <p>{t('supprimerFoyer.exportExplication')}</p>
                <SecondaryButton onClick={() => void exporter()} disabled={enCours}>
                  {t('supprimerFoyer.exporter')}
                </SecondaryButton>
                {exportFait && <p className="text-positif">{t('supprimerFoyer.exportFait')}</p>}
              </section>

              <p className="text-sm text-negatif">{t('supprimerFoyer.irreversible')}</p>
              <Field label={t('supprimerFoyer.confirmationLabel', { phrase: apercu.confirmation_attendue })}>
                <Input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  aria-label={t('supprimerFoyer.confirmationAria')}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Field>
            </>
          )}

          {erreur && <EtatErreur message={erreur} />}
          <div className="flex justify-end gap-2.5">
            <SecondaryButton onClick={onClose} disabled={enCours}>
              {t('supprimerFoyer.annuler')}
            </SecondaryButton>
            <DangerButton type="submit" disabled={enCours || !pret}>
              {enCours ? t('supprimerFoyer.suppressionEnCours') : t('supprimerFoyer.supprimer')}
            </DangerButton>
          </div>
        </form>
      )}
    </Modale>
  )
}
