import { useId, type ReactNode } from 'react'
import { IconChevron } from './icons'

/** Un détail qu'on déplie à la demande, à l'intérieur d'une section (« Frais d'acquisition »,
 * « Zone géographique »...) : une ligne qui dit ce qu'il contient et, repliée, ce qu'il
 * contient DÉJÀ (`resume`) — on ne cache pas une valeur saisie derrière un clic sans le dire.
 *
 * Contrôlé par l'appelant : il sait quand une erreur doit forcer l'ouverture.
 * Même mécanique que `SectionRepliable` (contenu non monté tant que replié, apparition en CSS),
 * en plus discret : un lien, pas une carte. */
export default function Depliant({
  titre,
  resume,
  ouvert,
  onToggle,
  children,
}: {
  titre: string
  resume?: string
  ouvert: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        aria-controls={ouvert ? id : undefined}
        className="flex min-h-11 w-full items-center gap-2 rounded-control text-left text-sm font-medium text-accent hover:underline md:min-h-9"
      >
        <IconChevron className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${ouvert ? '-rotate-90' : 'rotate-180'}`} />
        <span className="min-w-0">{titre}</span>
        {resume && !ouvert && <span className="ml-auto min-w-0 truncate text-[13px] font-normal text-ink3">{resume}</span>}
      </button>
      {ouvert && (
        <div id={id} className="section-ouverture mt-2 space-y-4 rounded-card border border-hairline bg-field p-4">
          {children}
        </div>
      )}
    </div>
  )
}
