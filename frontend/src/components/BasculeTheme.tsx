import { useTheme, type Theme } from '../hooks/useTheme'
import { IconEcran, IconLune, IconSoleil } from './icons'

// Bascule discrète du thème (LOT 5.12) : un clic fait cycler clair → sombre →
// système → clair, plutôt que trois boutons séparés. Extrait de `App.tsx` lors du
// passage à la barre latérale (backlog 2.K.2) pour être réutilisable dans le menu
// du compte.
const THEME_SUIVANT: Record<Theme, Theme> = { clair: 'sombre', sombre: 'systeme', systeme: 'clair' }
const THEME_ICONES: Record<Theme, (props: { className?: string }) => React.JSX.Element> = {
  clair: IconSoleil,
  sombre: IconLune,
  systeme: IconEcran,
}
// « Éclipse » plutôt que « Sombre » (backlog § AF.5, 15/09/2026, validé avec réserve
// explicite sur la clarté) — le clin d'œil reste accompagné de l'icône lune
// (`IconLune`, universellement reconnue), qui porte la clarté que le mot seul
// pourrait perdre.
const THEME_LABELS: Record<Theme, string> = { clair: 'Clair', sombre: 'Éclipse', systeme: 'Système' }

export default function BasculeTheme({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const Icone = THEME_ICONES[theme]
  return (
    <button
      type="button"
      onClick={() => setTheme(THEME_SUIVANT[theme])}
      title={`Thème : ${THEME_LABELS[theme]} (cliquer pour changer)`}
      aria-label={`Thème : ${THEME_LABELS[theme]}. Cliquer pour changer.`}
      className={`flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-sm text-texte-attenue hover:bg-surface-elevee ${className}`}
    >
      {/* Micro-interaction (backlog § AF.2, 15/09/2026) : `key={theme}` force React à
          remonter l'icône à chaque changement, ce qui relance l'animation CSS
          (`animate-lumen-bascule-theme`, `index.css`) — pas d'état ni de minuteur à
          gérer côté composant. */}
      <Icone key={theme} className="h-4 w-4 animate-lumen-bascule-theme" />
      <span>Thème : {THEME_LABELS[theme]}</span>
    </button>
  )
}
