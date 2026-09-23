import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { AlerteFraicheurItem } from '../api/types'
import Card from './Card'
import { formatDate } from '../utils/format'
import { t } from '../i18n'

/** Alertes de fraîcheur des valorisations manuelles (backlog § BA.2, veille
 * concurrentielle du 21/09/2026) : signale les lignes valorisées
 * manuellement (immobilier, assurance-vie...) dont la valeur n'a pas été
 * retouchée depuis plus d'un an — `GET /api/patrimoine/alertes-fraicheur`.
 *
 * Ne rend rien tant que la liste est vide (chargement, erreur réseau, ou
 * simplement rien à signaler) : une liste vide est l'état SAIN et normal,
 * jamais une erreur à afficher poliment — cette carte est un bonus discret,
 * pas un bloc qui doit se faire remarquer sur l'écran Analyse. */
export default function AlerteFraicheurCard() {
  const [alertes, setAlertes] = useState<AlerteFraicheurItem[]>([])

  useEffect(() => {
    api
      .getAlertesFraicheur()
      .then(setAlertes)
      .catch(() => setAlertes([]))
  }, [])

  if (alertes.length === 0) return null

  return (
    <Card title={t('alerteFraicheurCard.donneesARafraichir')}>
      <ul className="space-y-2 text-sm text-texte">
        {alertes.map((a) => (
          <li key={a.holding_id}>
            {a.nom} ({a.type_actif_label}{t('alerteFraicheurCard.nonMiseAJourDepuis')}{' '}{formatDate(a.date_valeur_estimee)} (
            {a.jours_depuis_maj}{' '}{t('alerteFraicheurCard.jours')}</li>
        ))}
      </ul>
    </Card>
  )
}
