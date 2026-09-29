import type { CategorieBudget, RecurrenceDetectee } from '../api/types'
import Card from './Card'
import { IconChevron } from './icons'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro, formatPct } from '../utils/format'
import { t } from '../i18n'

type Periodique = RecurrenceDetectee & { periodicite: 'mensuelle' | 'trimestrielle' | 'annuelle' }

const LIBELLE_PERIODICITE = {
  mensuelle: 'recurrencesSection.mensuelle',
  trimestrielle: 'recurrencesSection.trimestrielle',
  annuelle: 'recurrencesSection.annuelle',
} as const

const estPeriodique = (r: RecurrenceDetectee): r is Periodique => r.periodicite !== 'irreguliere'

/** Charges récurrentes et abonnements (backlog 2.N.3) : sous-produit de l'import,
 * sur une fenêtre glissante indépendante de la période affichée à l'écran (un
 * abonnement mensuel reste un abonnement qu'on regarde 1 mois ou 1 an de budget).
 *
 * Seules les séries périodiques (mensuelle, trimestrielle, annuelle) forment la liste
 * principale. Les commerces fréquentés sans rythme (§ BM.2) — grande surface,
 * pharmacie, virements ponctuels — vont dans un bloc replié « Achats fréquents » : ce
 * ne sont pas des charges, et les mêler aux abonnements noierait ceux-ci. */
export default function RecurrencesSection({ recurrences, categories }: { recurrences: RecurrenceDetectee[]; categories: CategorieBudget[] }) {
  const { montantsMasques } = usePreferencesAffichage()

  if (recurrences.length === 0) return null

  const periodiques = recurrences.filter(estPeriodique)
  const achatsFrequents = recurrences.filter((r) => !estPeriodique(r))
  const nomCategorie = (r: RecurrenceDetectee) => categories.find((c) => c.id === r.categorie_id)?.nom ?? '—'

  return (
    <Card title={t('recurrencesSection.chargesRecurrentesEtAbonnements')}>
      <p className="mb-3 text-xs text-texte-attenue">{t('recurrencesSection.detecteAutomatiquement')}</p>
      {periodiques.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bordure text-left text-xs font-medium uppercase text-texte-attenue">
              <th className="py-2 pr-4">{t('recurrencesSection.libelle')}</th>
              <th className="py-2 pr-4">{t('recurrencesSection.categorie')}</th>
              <th className="py-2 pr-4">{t('recurrencesSection.periodicite')}</th>
              <th className="py-2 pr-4 text-right">{t('recurrencesSection.occurrences')}</th>
              <th className="py-2 pr-4 text-right">{t('recurrencesSection.montant')}</th>
              <th className="py-2 pr-4 text-right">{t('recurrencesSection.coutAnnuelEstime')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordure">
            {periodiques.map((r) => (
              <tr key={r.libelle}>
                <td className="py-2 pr-4 text-texte">{r.libelle}</td>
                <td className="py-2 pr-4 text-texte-attenue">{nomCategorie(r)}</td>
                <td className="py-2 pr-4 text-texte-attenue">{t(LIBELLE_PERIODICITE[r.periodicite])}</td>
                <td className="py-2 pr-4 text-right text-texte-attenue">{r.occurrences}</td>
                <td className="py-2 pr-4 text-right">
                  <span className="font-medium text-texte">{formatEuro(r.montant_actuel, 2, montantsMasques)}</span>
                  {r.hausse_prix && (
                    <span className="ml-2 rounded-chip bg-avertissement/15 px-2 py-0.5 text-xs font-medium text-avertissement">{t('recurrencesSection.hausseDePrix')}</span>
                  )}
                  {r.hausse_prix && r.variation_prix_pct !== null && r.variation_prix_pct > 0 && (
                    <p className="text-xs text-texte-attenue">
                      {t('recurrencesSection.evolutionDepuis', {
                        pct: formatPct(r.variation_prix_pct),
                        montant: formatEuro(r.montant_initial, 2, montantsMasques),
                      })}
                    </p>
                  )}
                </td>
                <td className="py-2 pr-4 text-right text-texte-attenue">
                  {r.cout_annuel_estime === null ? '—' : formatEuro(r.cout_annuel_estime, 2, montantsMasques)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {achatsFrequents.length > 0 && (
        <details className="group mt-4 border-t border-bordure pt-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-texte [&::-webkit-details-marker]:hidden">
            <IconChevron className="h-4 w-4 shrink-0 rotate-180 text-ink3 transition-transform group-open:-rotate-90" aria-hidden />
            {t('recurrencesSection.achatsFrequents')} ({achatsFrequents.length})
          </summary>
          <p className="mb-2 mt-2 text-xs text-texte-attenue">{t('recurrencesSection.achatsFrequentsAide')}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bordure text-left text-xs font-medium uppercase text-texte-attenue">
                <th className="py-2 pr-4">{t('recurrencesSection.libelle')}</th>
                <th className="py-2 pr-4">{t('recurrencesSection.categorie')}</th>
                <th className="py-2 pr-4 text-right">{t('recurrencesSection.occurrences')}</th>
                <th className="py-2 pr-4 text-right">{t('recurrencesSection.totalObserve')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {achatsFrequents.map((r) => (
                <tr key={r.libelle}>
                  <td className="py-2 pr-4 text-texte">{r.libelle}</td>
                  <td className="py-2 pr-4 text-texte-attenue">{nomCategorie(r)}</td>
                  <td className="py-2 pr-4 text-right text-texte-attenue">{r.occurrences}</td>
                  <td className="py-2 pr-4 text-right font-medium text-texte">{formatEuro(r.total_periode, 2, montantsMasques)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </Card>
  )
}
