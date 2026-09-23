import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Jalon } from '../api/types'
import { IconBadge, IconFermer } from './icons'
import { t } from '../i18n'

const DUREE_AFFICHAGE_MS = 7000

/** Backlog § AG.3 (16/09/2026) — célébration discrète d'un jalon tout juste
 * franchi : un accusé de réception chaleureux, jamais un palier à grinder. Pas de
 * confettis plein écran façon appli de courtage (garde-fou explicite du backlog) —
 * même patron que `LumenFaitAmusant.tsx` (portail vers `document.body`, `role`
 * `status`, se ferme seule après quelques secondes ou au clic sur « Fermer »),
 * réutilise `animate-lumen-allumage` (entrée en fondu-zoom) plutôt qu'une
 * animation dédiée : un jalon franchi mérite le même égard visuel qu'un premier
 * chargement, pas un vocabulaire à part.
 *
 * Ne se rejoue jamais pour le même jalon : `App.tsx` appelle
 * `api.marquerJalonCelebre` au montage, une bonne fois pour toutes (jalon.nouveau
 * ne redevient plus jamais `true` ensuite, cf. `jalons_service.py`). */
export default function CelebrationJalon({ jalon, onFermer }: { jalon: Jalon; onFermer: () => void }) {
  useEffect(() => {
    const minuteur = setTimeout(onFermer, DUREE_AFFICHAGE_MS)
    return () => clearTimeout(minuteur)
  }, [onFermer])

  return createPortal(
    <div
      role="status"
      className="animate-lumen-allumage fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-start gap-3 rounded-panel border border-stroke bg-panel-hi px-4 py-3 text-sm text-ink shadow-glass-lg backdrop-blur-glass"
    >
      <IconBadge className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <span>
        <span className="font-semibold">{jalon.titre}</span> — {jalon.description}
      </span>
      <button
        type="button"
        onClick={onFermer}
        aria-label={t('celebrationJalon.fermer')}
        className="shrink-0 text-texte-attenue hover:text-texte"
      >
        <IconFermer className="h-4 w-4" />
      </button>
    </div>,
    document.body,
  )
}
