import type { QualiteDonnees } from '../api/types'
import Card from './Card'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

/** Encart de qualité des données (LOT 2.1/2.3) : la répartition géo/sectorielle du
 * tableau de bord n'a de sens que si l'utilisateur sait à quel point le "réel" est
 * mesuré plutôt qu'estimé — voire pas connu du tout. N'affiche rien tant qu'il n'y a
 * rien à signaler (portefeuille entièrement couvert par une composition réelle et
 * coté). */
export default function QualiteDonneesCard({ qualite }: { qualite: QualiteDonnees }) {
  const { montantsMasques } = usePreferencesAffichage()
  const lignes: string[] = []

  if (qualite.pct_estimee_par_indice > 0) {
    lignes.push(
      t('qualiteDonneesCard.estimeeParIndice', {
        pct: qualite.pct_estimee_par_indice,
        valeur: formatEuro(qualite.valeur_estimee_par_indice, 0, montantsMasques),
      }),
    )
  }

  if (qualite.pct_non_categorisee > 0) {
    lignes.push(
      t('qualiteDonneesCard.nonCategorisee', {
        pct: qualite.pct_non_categorisee,
        valeur: formatEuro(qualite.valeur_non_categorisee, 0, montantsMasques),
      }),
    )
  }

  if (qualite.valeur_sans_cotation > 0) {
    lignes.push(
      t('qualiteDonneesCard.sansCotation', {
        valeur: formatEuro(qualite.valeur_sans_cotation, 0, montantsMasques),
        pct: qualite.pct_sans_cotation,
      }),
    )
  }

  if (lignes.length === 0) return null

  // Bandeau d'alerte à fond teinté (backlog 2.K.1) : volontairement hors des 9
  // jetons sémantiques, comme la palette catégorielle d'AidePage — `avertissement`
  // n'est qu'une couleur scalaire (texte/bordure fine), pas un jeton de fond teinté
  // à plusieurs nuances avec opacité ; en introduire un pour ce seul usage aurait
  // été prématuré (aucun autre bandeau de ce type dans l'application aujourd'hui).
  return (
    <Card className="border-avertissement/25 bg-avertissement/10">
      <p className="mb-2 text-sm font-semibold text-avertissement">{t('qualiteDonneesCard.qualiteDesDonnees')}</p>
      <ul className="space-y-1.5">
        {lignes.map((ligne) => (
          <li key={ligne} className="text-sm text-avertissement">
            {ligne}
          </li>
        ))}
      </ul>
    </Card>
  )
}
