import { useId, type ReactNode } from 'react'
import { IconChevron, IconCoche } from './icons'
import { GlassPanel } from './GlassPanel'
import { t } from '../i18n'

export type EtatSection = 'neutre' | 'complet' | 'erreur'

/** Une section d'un formulaire long, repliable (§ BN.1, lot 2) : le titre reste visible, avec
 * en dessous le résumé de ce qui a été saisi — refermée, une section dit encore où elle en est,
 * et l'on parcourt le formulaire d'un coup d'œil.
 *
 * Le contenu d'une section repliée n'est PAS monté : ses champs ne sont plus dans l'ordre de
 * tabulation (le focus ne tombe jamais dans du caché) et le DOM reste léger. L'état saisi vit
 * chez le parent, il ne se perd donc pas au repli. Exception, `garderMonte` : un contenu qui
 * porte son PROPRE état (un éditeur de répartition en cours de saisie) reste monté mais caché
 * (`hidden` : hors de l'arbre d'accessibilité et de l'ordre de tabulation), pour qu'un repli
 * n'efface pas ce qu'on était en train de taper.
 *
 * `variante` : `imbriquee` dans une modale (un filet et un fond léger, pour ne pas empiler un
 * verre sur un verre), `panneau` comme carte à part entière d'un écran (onglet Paramètres).
 *
 * L'apparition du contenu est une animation CSS (`section-ouverture`, désactivée par
 * `prefers-reduced-motion` dans `index.css`) : aucune bibliothèque, aucun JS d'animation. */
export default function SectionRepliable({
  titre,
  resume,
  numero,
  ouvert,
  onToggle,
  etat = 'neutre',
  nombreErreurs = 0,
  variante = 'imbriquee',
  idSection,
  garderMonte = false,
  children,
}: {
  titre: string
  /** Une ligne sous le titre quand la section est repliée (ou ouverte, si elle en a un). */
  resume?: string
  /** Numéro d'étape dans la pastille ; remplacé par une coche quand la section est complète. */
  numero?: number
  ouvert: boolean
  onToggle: () => void
  etat?: EtatSection
  nombreErreurs?: number
  variante?: 'imbriquee' | 'panneau'
  idSection?: string
  garderMonte?: boolean
  children: ReactNode
}) {
  const idAuto = useId()
  const id = idSection ?? idAuto
  const idEntete = `${id}-entete`
  const idPanneau = `${id}-panneau`

  const entete = (
    <h3>
      <button
        type="button"
        id={idEntete}
        aria-expanded={ouvert}
        aria-controls={ouvert || garderMonte ? idPanneau : undefined}
        onClick={onToggle}
        className="flex min-h-14 w-full items-center gap-3 rounded-card px-4 py-3 text-left transition-colors hover:bg-hover"
      >
        {numero !== undefined && (
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-chip text-xs font-semibold ${
              etat === 'erreur' ? 'bg-neg-bg text-neg' : etat === 'complet' ? 'bg-pos-bg text-pos' : 'bg-track text-ink2'
            }`}
          >
            {etat === 'complet' ? <IconCoche className="h-4 w-4" /> : numero}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold -tracking-[0.01em] text-ink">{titre}</span>
          {resume && <span className="mt-0.5 block truncate text-[13px] text-ink3">{resume}</span>}
        </span>
        {nombreErreurs > 0 && (
          <span className="shrink-0 rounded-chip bg-neg-bg px-2.5 py-0.5 text-xs font-semibold text-neg">
            {t('sectionRepliable.nErreurs', { n: nombreErreurs })}
          </span>
        )}
        <IconChevron className={`h-5 w-5 shrink-0 text-ink3 transition-transform motion-reduce:transition-none ${ouvert ? '-rotate-90' : 'rotate-180'}`} />
      </button>
    </h3>
  )

  const corps = (ouvert || garderMonte) && (
    <section id={idPanneau} aria-labelledby={idEntete} hidden={!ouvert} className="section-ouverture border-t border-hairline px-4 pb-5 pt-4">
      {children}
    </section>
  )

  if (variante === 'panneau') {
    return (
      <GlassPanel as="section">
        {entete}
        {corps}
      </GlassPanel>
    )
  }
  return (
    <section className="rounded-card border border-hairline bg-chip">
      {entete}
      {corps}
    </section>
  )
}
