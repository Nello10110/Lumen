import { useState } from 'react'
import { api } from '../api/client'
import type { BudgetSummary } from '../api/types'
import Card from './Card'
import EtatVide from './EtatVide'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatEuro } from '../utils/format'
import { t } from '../i18n'

/** Édition inline du budget cible d'une catégorie racine (backlog 2.N.2) — champ
 * texte local, enregistré sur perte de focus/Entrée plutôt qu'à chaque frappe. */
function CibleInput({ categorieId, valeurInitiale, onSaved }: { categorieId: number; valeurInitiale: number | null; onSaved: () => void }) {
  const [valeur, setValeur] = useState(valeurInitiale !== null ? String(valeurInitiale) : '')
  const [saving, setSaving] = useState(false)

  async function enregistrer() {
    const vide = valeur.trim() === ''
    const nombre = Number(valeur)
    // Vider le champ RETIRE la cible. Auparavant on sortait sans rien faire : une
    // cible posée par erreur ne pouvait plus être enlevée par l'interface, alors
    // que l'endpoint de suppression existait déjà côté serveur — fonctionnalité
    // inachevée plutôt que code mort (revue du 03/09/2026).
    if (!vide && (Number.isNaN(nombre) || nombre < 0)) return
    if (vide && valeurInitiale === null) return  // rien à retirer, rien à enregistrer
    setSaving(true)
    try {
      if (vide) {
        await api.deleteBudgetCible(categorieId)
      } else {
        await api.setBudgetCible(categorieId, nombre)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <input
      type="number"
      min={0}
      step="any"
      value={valeur}
      disabled={saving}
      onChange={(e) => setValeur(e.target.value)}
      onBlur={enregistrer}
      onKeyDown={(e) => e.key === 'Enter' && enregistrer()}
      placeholder="—"
      title={t('repartitionSection.montantMensuelVisePourCette')}
      className="w-24 rounded-control border border-bordure bg-surface px-2 py-1 text-right text-sm text-texte"
    />
  )
}

export default function RepartitionSection({ summary, onCibleChanged }: { summary: BudgetSummary; onCibleChanged: () => void }) {
  const { montantsMasques } = usePreferencesAffichage()

  if (summary.repartition_sorties.length === 0) {
    return (
      <Card title={t('repartitionSection.repartitionDesSorties')}>
        <EtatVide titre={t('repartitionSection.aucuneSortieSurCettePeriode')} />
      </Card>
    )
  }

  return (
    <Card title={t('repartitionSection.repartitionDesSorties')}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bordure text-left text-xs font-medium uppercase text-texte-attenue">
            <th className="py-2 pr-4">{t('repartitionSection.categorie')}</th>
            <th className="py-2 pr-4 text-right">{t('repartitionSection.montant')}</th>
            <th className="py-2 pr-4 text-right">{t('repartitionSection.budgetCible')}</th>
            <th className="py-2 pr-4 text-right">{t('repartitionSection.ecart')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bordure">
          {summary.repartition_sorties.map((item) => {
            const ecart = item.cible_mensuelle !== null ? item.cible_mensuelle - item.montant : null
            return (
              <tr key={item.categorie_id ?? 'non-categorise'}>
                <td className="py-2 pr-4 text-texte">{item.categorie_nom}</td>
                <td className="py-2 pr-4 text-right text-texte">{formatEuro(item.montant, 2, montantsMasques)}</td>
                <td className="py-2 pr-4 text-right">
                  {item.categorie_id !== null ? (
                    <CibleInput categorieId={item.categorie_id} valeurInitiale={item.cible_mensuelle} onSaved={onCibleChanged} />
                  ) : (
                    '—'
                  )}
                </td>
                <td className={`py-2 pr-4 text-right font-medium ${ecart === null ? 'text-texte-attenue' : ecart >= 0 ? 'text-positif' : 'text-negatif'}`}>
                  {ecart !== null ? formatEuro(ecart, 2, montantsMasques) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}
