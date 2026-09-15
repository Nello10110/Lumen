import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconFermer } from './icons'

const DUREE_AFFICHAGE_MS = 6000

/** Easter egg discret (backlog § AD.5, 15/09/2026) : cliquer 5 fois de suite sur le
 * logo de la sidebar dans un délai court affiche ce fait amusant — un seul niveau,
 * purement décoratif, sans persistance ni easter egg en cascade (pas de Konami
 * code, pas de mode caché). Déclenchement compté dans `Sidebar.tsx`, ce composant
 * n'est que l'affichage. Se ferme seul après quelques secondes, ou au clic sur
 * « Fermer ». Même patron que `MiseAJourDisponible.tsx` (portail vers
 * `document.body` : un `position: fixed` posé plus haut dans l'arbre resterait
 * piégé derrière un panneau `backdrop-filter`, cf. sa docstring). */
export default function LumenFaitAmusant({ onFermer }: { onFermer: () => void }) {
  useEffect(() => {
    const minuteur = setTimeout(onFermer, DUREE_AFFICHAGE_MS)
    return () => clearTimeout(minuteur)
  }, [onFermer])

  return createPortal(
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-start gap-3 rounded-panel border border-stroke bg-panel-hi px-4 py-3 text-sm text-ink shadow-glass-lg backdrop-blur-glass"
    >
      <span>
        Un lumen, c'est le flux lumineux d'une bougie à un mètre. Votre patrimoine, lui, n'a pas d'unité SI — mais on garde
        le nom.
      </span>
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer"
        className="shrink-0 text-texte-attenue hover:text-texte"
      >
        <IconFermer className="h-4 w-4" />
      </button>
    </div>,
    document.body,
  )
}
