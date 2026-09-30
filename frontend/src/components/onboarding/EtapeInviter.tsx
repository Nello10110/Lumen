import SectionInvitations from '../SectionInvitations'
import { t } from '../../i18n'

/** Étape « Inviter les membres du foyer » de `steps.ts` (backlog § BK.2b) — facultative,
 * comme les autres : réutilise `SectionInvitations` tel quel (le même formulaire que
 * Réglages → Comptes & sécurité), qui liste aussi les invitations déjà créées — au rejeu
 * de l'assistant, elles apparaissent plutôt que d'être refaites. */
export default function EtapeInviter() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-texte">{t('assistant.inviter')}</p>
      <SectionInvitations />
    </div>
  )
}
