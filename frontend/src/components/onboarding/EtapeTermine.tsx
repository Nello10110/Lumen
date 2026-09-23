import { useAuth } from '../../hooks/useAuth'
import { t } from '../../i18n'

/** Étape "Terminé" de `steps.ts` — message final adapté lui aussi au rejeu, même
 * logique qu'`EtapeBienvenue`. */
export default function EtapeTermine() {
  const { user } = useAuth()
  const rejeu = user?.onboarding_termine ?? false

  return (
    <div className="space-y-3 text-sm text-texte">
      <p>{rejeu ? t('assistant.termine.rejeu') : t('assistant.termine.pret')}</p>
      <p className="text-texte-attenue">{t('assistant.termine.accessible')}</p>
    </div>
  )
}
