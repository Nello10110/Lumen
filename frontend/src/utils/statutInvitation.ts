import type { StatutInvitation } from '../api/types'
import { t } from '../i18n'

/** Ton du badge d'une invitation selon son état : partagé par les invitations d'un foyer
 * (`SectionInvitations`) et les liens « créer votre foyer » (`SectionLiensFoyer`). */
export const TON_STATUT_INVITATION: Record<StatutInvitation, 'accent' | 'positif' | 'neutre' | 'avertissement'> = {
  en_attente: 'accent',
  acceptee: 'positif',
  revoquee: 'neutre',
  expiree: 'avertissement',
}

export function libelleStatutInvitation(statut: StatutInvitation): string {
  if (statut === 'en_attente') return t('sectionInvitations.statutEnAttente')
  if (statut === 'acceptee') return t('sectionInvitations.statutAcceptee')
  if (statut === 'revoquee') return t('sectionInvitations.statutRevoquee')
  return t('sectionInvitations.statutExpiree')
}
