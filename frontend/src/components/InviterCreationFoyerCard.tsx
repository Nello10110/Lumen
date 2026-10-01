import { api } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import Card from './Card'
import SectionLiensFoyer from './SectionLiensFoyer'
import { t } from '../i18n'

/** « Inviter un proche à créer son foyer » (backlog § BK.2d) : un lien « créer votre foyer »
 * pour quelqu'un qui n'aura pas à demander à l'opérateur — parrainage. Réservé au mode de
 * naissance `invitation` de l'installation ; en mode `ferme`, seul l'opérateur crée un foyer,
 * et la section n'est pas proposée (`peut_inviter_a_creer_foyer`, posé par le serveur). Le
 * proche devient propriétaire de SON foyer : il n'entre pas dans celui-ci. */
export default function InviterCreationFoyerCard() {
  const { user } = useAuth()
  if (!user?.peut_inviter_a_creer_foyer) return null

  return (
    <Card title={t('inviterCreationFoyer.titre')}>
      <p className="mb-4 text-sm text-texte-attenue">{t('inviterCreationFoyer.intro')}</p>
      <SectionLiensFoyer source={api} />
    </Card>
  )
}
