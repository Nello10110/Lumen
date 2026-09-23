import PreferencesCard from '../PreferencesCard'
import { t } from '../../i18n'

/** Étape "Préférences" de `steps.ts` — réutilise `PreferencesCard` tel quel (déjà
 * autonome, charge/sauvegarde le réglage réel) : affiche et modifie directement l'état
 * enregistré, aussi bien à la première visite qu'au rejeu depuis Réglages. */
export default function EtapePreferences() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-texte">{t('assistant.preferences')}</p>
      <PreferencesCard />
    </div>
  )
}
