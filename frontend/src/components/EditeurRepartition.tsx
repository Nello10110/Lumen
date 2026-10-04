import type { ReactNode } from 'react'
import type { useEditeurQuotites } from '../hooks/useEditeurQuotites'
import { PrimaryButton } from './Controls'
import EtatErreur from './EtatErreur'
import RepartitionMembres from './RepartitionMembres'
import { SkeletonTexte } from './Skeleton'
import { t } from '../i18n'

/** Corps commun des éditeurs de répartition enregistrable d'un compte, d'un prêt et d'un bien
 * (§ BN.1, lot 2) : états de chargement, répartition pré-remplie, bouton d'enregistrement qui
 * dit ce qu'il remplace, confirmation. Le conteneur (carte, ligne dépliée) reste chez
 * l'appelant, comme son titre et sa phrase d'introduction.
 *
 * `null` quand aucun membre n'est déclaré, sauf si l'appelant fournit `sansMembres` : une
 * fiche de bien préfère le dire (« aucun membre — le bien appartient au foyer ») que de
 * s'effacer. */
export default function EditeurRepartition({
  editeur,
  introduction,
  libelleEnregistrer,
  portee,
  confirmation,
  valeurBien,
  detteBien,
  suitPret,
  sansMembres,
  idBase,
}: {
  editeur: ReturnType<typeof useEditeurQuotites>
  introduction?: ReactNode
  /** Le texte du bouton : il dit l'action, « Appliquer à toutes les lignes du compte ». */
  libelleEnregistrer: string
  /** Ce qui sera remplacé, sous le bouton : « Remplace la répartition actuelle de 3 lignes. » */
  portee?: string
  confirmation: string
  valeurBien?: number | null
  detteBien?: number
  suitPret?: boolean
  sansMembres?: ReactNode
  idBase?: string
}) {
  const { detenteurs, erreurChargement, rechargerDetenteurs, saisie, setSaisie, source, totalValide, saving, error, enregistre, handleSave } =
    editeur

  if (erreurChargement !== null) {
    return <EtatErreur message={t('editeurRepartition.erreurMembres', { erreur: erreurChargement })} onReessayer={rechargerDetenteurs} />
  }
  if (detenteurs === null) return <SkeletonTexte lignes={2} />
  if (detenteurs.length === 0) return <>{sansMembres ?? null}</>

  return (
    <div className="space-y-4">
      {introduction && <div className="text-sm text-ink2">{introduction}</div>}
      {source === 'proposee' && (
        <p className="rounded-control bg-accent-soft px-3 py-2 text-sm text-accent">{t('editeurRepartition.proposition')}</p>
      )}
      {source === 'divergente' && (
        <p className="rounded-control bg-warn-bg px-3 py-2 text-sm text-warn">{t('editeurRepartition.divergente')}</p>
      )}
      <RepartitionMembres
        membres={detenteurs}
        valeurs={saisie}
        onChange={setSaisie}
        valeurBien={valeurBien}
        detteBien={detteBien}
        suitPret={suitPret}
        idBase={idBase}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <PrimaryButton onClick={handleSave} disabled={!totalValide || saving}>
          {saving ? t('editeurRepartition.enregistrement') : libelleEnregistrer}
        </PrimaryButton>
        {enregistre && <output className="text-sm font-medium text-pos">{confirmation}</output>}
        {error && <EtatErreur message={error} />}
      </div>
      {portee && <p className="text-xs text-ink3">{portee}</p>}
    </div>
  )
}
