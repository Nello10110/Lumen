import DetenteursCard from '../DetenteursCard'
import { t } from '../../i18n'

/** Étape "Détenteurs du foyer" de `steps.ts` — même raison qu'`EtapePreferences` :
 * réutilise `DetenteursCard` tel quel, liste réellement les détenteurs déjà déclarés
 * (jamais un formulaire vide figé) et permet d'en ajouter/retirer au rejeu. */
export default function EtapeDetenteurs() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-texte">{t('assistant.detenteurs')}</p>
      <DetenteursCard />
    </div>
  )
}
