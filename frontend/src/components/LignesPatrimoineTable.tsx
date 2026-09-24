import type { LignePatrimoineFiltree } from '../api/types'
import EtatVide from './EtatVide'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro, formatPourcent, formatQuantite } from '../utils/format'
import { t } from '../i18n'
import { libelleDonnee } from '../i18n/donnees'

/** Détail des lignes composant le total affiché par le graphique Évolution de
 * l'écran Analyse (§ AX, retour utilisateur du 17/09/2026 : « ajouter en dessous du
 * graphique les lignes correspondantes pour voir le détail »). Composition
 * ACTUELLE (aujourd'hui), pas une reconstruction historique à une date passée —
 * cf. la docstring de `patrimoine_service.lignes_patrimoine_filtrees` pour le
 * pourquoi. `lentille` choisit la colonne affichée (`valeur`/`valeur_nette`, déjà
 * calculées côté serveur) plutôt que de redemander les données au changement de
 * bouton Brut/Net. */
export default function LignesPatrimoineTable({
  lignes,
  lentille,
  detenteurFiltre,
}: {
  lignes: LignePatrimoineFiltree[]
  lentille: 'brut' | 'net'
  detenteurFiltre: boolean
}) {
  const { montantsMasques } = usePreferencesAffichage()

  if (lignes.length === 0) {
    return <EtatVide titre={t('lignesPatrimoineTable.aucuneLignePourCetteCombinaison')} />
  }

  const cleValeur = lentille === 'brut' ? 'valeur' : 'valeur_nette'
  const total = lignes.reduce((somme, l) => somme + l[cleValeur], 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bordure text-left text-xs font-medium uppercase text-texte-attenue">
            <th className="py-2 pr-4">{t('lignesPatrimoineTable.ligne')}</th>
            <th className="py-2 pr-4">{t('lignesPatrimoineTable.classe')}</th>
            <th className="py-2 pr-4">{t('lignesPatrimoineTable.compte')}</th>
            <th className="py-2 pr-4 text-right">{t('lignesPatrimoineTable.quantite')}</th>
            {detenteurFiltre && <th className="py-2 pr-4 text-right">{t('lignesPatrimoineTable.quotePart')}</th>}
            <th className="py-2 pr-4 text-right">{lentille === 'brut' ? t('lignesPatrimoineTable.valeur') : t('lignesPatrimoineTable.valeurNette')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bordure">
          {lignes.map((l) => (
            <tr key={l.holding_id}>
              <td className="py-2 pr-4 text-texte">{l.nom || l.ticker}</td>
              <td className="py-2 pr-4 text-texte-attenue">{libelleDonnee(l.type_actif_label)}</td>
              <td className="py-2 pr-4 text-texte-attenue">
                {l.compte_nom ?? t('lignesPatrimoineTable.sansCompte')}
                {l.etablissement_nom ? ` · ${l.etablissement_nom}` : ''}
              </td>
              <td className="py-2 pr-4 text-right text-texte">{formatQuantite(l.quantite)}</td>
              {detenteurFiltre && (
                <td className="py-2 pr-4 text-right text-texte">
                  {l.quotite_pct !== null ? formatPourcent(l.quotite_pct) : '—'}
                </td>
              )}
              <td className="py-2 pr-4 text-right font-medium text-texte">{formatEuro(l[cleValeur], 0, montantsMasques)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-bordure font-semibold">
            <td className="py-2 pr-4 text-texte" colSpan={detenteurFiltre ? 5 : 4}>{t('lignesPatrimoineTable.total')}</td>
            <td className="py-2 pr-4 text-right text-texte">{formatEuro(total, 0, montantsMasques)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
