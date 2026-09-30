import type { Role } from '../api/types'
import { t } from '../i18n'

/** Libellé d'un rôle de foyer, dans la langue active. */
export function libelleRole(role: Role): string {
  if (role === 'proprietaire') return t('gestionFoyerCard.roleProprietaire')
  if (role === 'membre') return t('gestionFoyerCard.roleMembre')
  return t('gestionFoyerCard.roleInvite')
}
