import { useEffect, useState } from 'react'
import { apiOperateur } from '../../api/client'
import type { CompteFoyerOperateur, FoyerOperateur } from '../../api/types'
import { PrimaryButton, SecondaryButton } from '../Controls'
import EtatErreur from '../EtatErreur'
import { Field, Select } from '../Field'
import Modale from '../Modale'
import { SkeletonTexte } from '../Skeleton'
import { t } from '../../i18n'

/** Désigne un nouveau propriétaire pour un foyer, parmi ses MEMBRES (backlog § BK.2d) — quand
 * le propriétaire a disparu. L'opérateur ne voit que des noms de comptes ; un invité n'est pas
 * proposé (le serveur le refuserait). L'éventuel propriétaire actuel redevient membre.
 * `onDesigne` reçoit le foyer à jour. */
export default function DesignerProprietaireModale({
  foyer,
  onDesigne,
  onClose,
}: {
  foyer: FoyerOperateur
  onDesigne: (foyer: FoyerOperateur) => void
  onClose: () => void
}) {
  const [comptes, setComptes] = useState<CompteFoyerOperateur[] | null>(null)
  const [erreurChargement, setErreurChargement] = useState<string | null>(null)
  const [membreId, setMembreId] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    apiOperateur
      .listComptesDuFoyer(foyer.id)
      .then(setComptes)
      .catch((err: Error) => setErreurChargement(err.message))
  }, [foyer.id])

  const candidats = (comptes ?? []).filter((c) => c.role === 'membre')

  async function designer(e: React.FormEvent) {
    e.preventDefault()
    if (!membreId) return
    setEnCours(true)
    setErreur(null)
    try {
      onDesigne(await apiOperateur.designerProprietaire(foyer.id, Number(membreId)))
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  return (
    <Modale onClose={onClose}>
      {({ titleId }) => (
        <form onSubmit={designer} className="space-y-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {t('designerProprietaire.titre', { foyer: foyer.nom ?? t('foyersOperateur.sansNom') })}
          </h2>
          {erreurChargement && <EtatErreur message={erreurChargement} />}
          {!comptes && !erreurChargement && <SkeletonTexte lignes={2} />}
          {comptes && candidats.length === 0 && <p className="text-sm text-ink2">{t('designerProprietaire.aucunMembre')}</p>}
          {candidats.length > 0 && (
            <>
              <p className="text-sm text-ink2">{t('designerProprietaire.explication')}</p>
              <Field label={t('designerProprietaire.membreLabel')}>
                <Select value={membreId} onChange={(e) => setMembreId(e.target.value)}>
                  <option value="">{t('designerProprietaire.choisir')}</option>
                  {candidats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.username}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}
          {erreur && <EtatErreur message={erreur} />}
          <div className="flex justify-end gap-2.5">
            <SecondaryButton onClick={onClose} disabled={enCours}>
              {t('designerProprietaire.annuler')}
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={enCours || !membreId}>
              {t('designerProprietaire.designer')}
            </PrimaryButton>
          </div>
        </form>
      )}
    </Modale>
  )
}
