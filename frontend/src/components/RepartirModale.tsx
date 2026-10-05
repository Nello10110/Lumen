import type { ReactNode } from 'react'
import type { QuotiteEntree } from '../api/types'
import { useEditeurQuotites } from '../hooks/useEditeurQuotites'
import EditeurRepartition from './EditeurRepartition'
import { IconFermer } from './icons'
import Modale from './Modale'
import { t } from '../i18n'

/** Fenêtre de répartition d'UNE ligne (un actif, un compte ou un prêt) entre les membres du foyer
 * (§ BN.1, lot 3) : le lien « Répartir » d'un badge « Non réparti » l'ouvre depuis le tableau des
 * actifs, la liste des comptes ou celle des prêts, sans passer par la fiche de la ligne.
 *
 * C'est le même éditeur que partout ailleurs (`useEditeurQuotites` + `EditeurRepartition`) : il
 * s'ouvre sur la répartition actuelle, ou sur des parts égales proposées quand il n'y en a pas, et
 * ne change rien tant qu'on n'enregistre pas. Une fois enregistrée, l'appelant recharge sa liste et
 * ferme la fenêtre : le badge a disparu, c'est la confirmation. */
export default function RepartirModale({
  nom,
  enregistrer,
  chargerValeursInitiales,
  introduction,
  portee,
  onClose,
  onEnregistre,
}: {
  nom: string
  enregistrer: (quotites: QuotiteEntree[]) => Promise<unknown>
  chargerValeursInitiales?: () => Promise<{ quotites: QuotiteEntree[]; divergente?: boolean }>
  introduction?: ReactNode
  portee?: string
  onClose: () => void
  onEnregistre: () => void
}) {
  const editeur = useEditeurQuotites({
    enregistrer,
    chargerValeursInitiales,
    proposerParDefaut: true,
    apresEnregistrement: onEnregistre,
  })

  return (
    <Modale
      onClose={onClose}
      pleinEcranMobile
      panelClassName="w-full max-w-[520px] rounded-hero border border-stroke bg-panel-hi p-5 shadow-glass-lg backdrop-blur-glass md:p-6 max-md:flex max-md:min-h-dvh max-md:max-w-none max-md:flex-col max-md:rounded-none max-md:border-0"
    >
      {({ titleId }) => (
        <>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-[20px] font-semibold tracking-title text-ink">
                {t('repartitionGlobale.repartirModale.titre', { nom })}
              </h2>
              <p className="mt-0.5 text-[13px] text-ink3">{t('repartitionGlobale.repartirModale.introduction')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('repartitionGlobale.repartirModale.fermer')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-chip bg-track text-ink3 hover:text-ink md:h-[30px] md:w-[30px]"
            >
              <IconFermer className="h-4 w-4" />
            </button>
          </div>
          <EditeurRepartition
            editeur={editeur}
            introduction={introduction}
            libelleEnregistrer={t('repartitionGlobale.repartirModale.enregistrer')}
            portee={portee}
            confirmation={t('repartitionGlobale.repartirModale.enregistree')}
            idBase="repartir"
          />
        </>
      )}
    </Modale>
  )
}
