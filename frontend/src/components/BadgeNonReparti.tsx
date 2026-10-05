import { Badge } from './Field'
import { t } from '../i18n'

/** Badge « Non réparti » d'une ligne qui n'a aucune part (§ BN.1, lot 3), avec, quand l'appelant
 * sait ouvrir la répartition, le lien « Répartir ». Le badge n'a de sens que si le foyer compte au
 * moins un membre : c'est à l'appelant de ne le poser qu'alors. Le lien est un vrai bouton (cible de
 * 44 px sur mobile) qui n'ouvre pas la ligne qui le porte. */
export default function BadgeNonReparti({ nom, onRepartir }: { nom: string; onRepartir?: () => void }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <Badge ton="avertissement" title={t('repartitionGlobale.badgeAide')}>
        {t('repartitionGlobale.badge')}
      </Badge>
      {onRepartir && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRepartir()
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={t('repartitionGlobale.repartirAria', { nom })}
          className="inline-flex min-h-11 items-center text-xs font-semibold text-accent hover:underline md:min-h-0"
        >
          {t('repartitionGlobale.repartir')}
        </button>
      )}
    </span>
  )
}
