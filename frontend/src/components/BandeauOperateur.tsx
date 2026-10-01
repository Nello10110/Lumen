import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import CreationOperateur from './CreationOperateur'
import { SecondaryButton } from './Controls'
import Card from './Card'
import { t } from '../i18n'

/** Bandeau de Réglages « Créer le compte opérateur » (backlog § BK.2d), proposé au propriétaire
 * tant qu'aucun opérateur n'existe et que l'installation n'a qu'un foyer
 * (`peut_amorcer_operateur`). L'opérateur administre l'installation — créer, suspendre ou
 * supprimer des foyers, tâches planifiées, logo SSO — sans jamais voir un patrimoine ; c'est un
 * compte distinct du propriétaire. Facultatif tant que la personne est seule sur
 * l'installation. Replié par défaut : un formulaire permanent en tête de Réglages serait
 * du bruit pour qui n'en veut pas.
 *
 * Le bandeau reste affiché une fois le compte créé (`cree`), le temps d'expliquer la suite :
 * le rechargement de l'utilisateur éteint `peut_amorcer_operateur`, ce qui le démonterait. */
export default function BandeauOperateur() {
  const { user } = useAuth()
  const [ouvert, setOuvert] = useState(false)
  const [cree, setCree] = useState(false)

  if (!user?.peut_amorcer_operateur && !cree) return null

  return (
    <Card title={t('bandeauOperateur.titre')}>
      <div className="space-y-4">
        {!cree && <p className="text-sm text-texte">{t('bandeauOperateur.texte')}</p>}
        {!ouvert && !cree && (
          <SecondaryButton onClick={() => setOuvert(true)}>{t('bandeauOperateur.ouvrir')}</SecondaryButton>
        )}
        {(ouvert || cree) && <CreationOperateur onCree={() => setCree(true)} />}
      </div>
    </Card>
  )
}
