import CreationOperateur from '../CreationOperateur'
import { t } from '../../i18n'

/** Étape « Administration de l'installation » de `steps.ts` (backlog § BK.2d) — facultative,
 * comme les autres, et proposée seulement au propriétaire qui peut amorcer l'opérateur
 * (`peut_amorcer_operateur` : aucun n'existe, un seul foyer) — c'est-à-dire, en pratique, au
 * premier compte d'une installation neuve. Créer l'opérateur maintenant, ou plus tard : le
 * bandeau de Réglages le propose tant que ce n'est pas fait. Réutilise le formulaire du bandeau. */
export default function EtapeOperateur() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-texte">{t('assistant.operateur')}</p>
      <p className="text-xs text-texte-attenue">{t('assistant.operateurPlusTard')}</p>
      <CreationOperateur />
    </div>
  )
}
