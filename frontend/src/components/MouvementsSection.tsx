import { useState } from 'react'
import { api } from '../api/client'
import type { CategorieBudget, MouvementBancaire } from '../api/types'
import Card from './Card'
import EtatVide from './EtatVide'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatDate, formatEuro } from '../utils/format'
import { categorieExclue, categoriesEnArbre } from '../utils/categoriesBudget'
import { t } from '../i18n'

/** Filtre par catégorie (backlog 2.N.2) — appliqué côté client sur la liste déjà
 * chargée pour la période : le volume d'un budget personnel reste modeste, et ça
 * évite un aller-retour réseau supplémentaire à chaque changement de filtre (même
 * logique que le filtrage par catégorie de `PortefeuillePage`). Le filtre par compte,
 * lui, vit au niveau de la page (§ BM.1) : il porte aussi sur les indicateurs.
 *
 * Un mouvement d'une catégorie exclue des totaux (§ BM.3) reste listé, marqué comme tel,
 * et atténué : il ne compte dans aucun indicateur de l'écran. */
export default function MouvementsSection({
  mouvementsPeriode,
  categories,
  onCategorized,
}: {
  mouvementsPeriode: MouvementBancaire[]
  categories: CategorieBudget[]
  onCategorized: () => void
}) {
  const { montantsMasques } = usePreferencesAffichage()
  const [filtreCategorieId, setFiltreCategorieId] = useState<number | 'TOUTES' | 'NON_CATEGORISE'>('TOUTES')

  const categoriesTriees = categoriesEnArbre(categories)
  const mouvements = mouvementsPeriode.filter((m) => {
    if (filtreCategorieId === 'NON_CATEGORISE' && m.categorie_id !== null) return false
    if (typeof filtreCategorieId === 'number' && m.categorie_id !== filtreCategorieId) return false
    return true
  })

  const filtres = (
    <select
      value={filtreCategorieId}
      onChange={(e) => setFiltreCategorieId(e.target.value === 'TOUTES' || e.target.value === 'NON_CATEGORISE' ? e.target.value : Number(e.target.value))}
      className="rounded-control border border-bordure bg-surface px-2 py-1 text-xs text-texte"
    >
      <option value="TOUTES">{t('mouvementsSection.toutesCategories')}</option>
      <option value="NON_CATEGORISE">{t('mouvementsSection.nonCategorise')}</option>
      {categoriesTriees.map((c) => (
        <option key={c.id} value={c.id}>
          {c.parent_id !== null ? '↳ ' : ''}
          {c.nom}
        </option>
      ))}
    </select>
  )

  if (mouvementsPeriode.length === 0) {
    return (
      <Card title={t('mouvementsSection.mouvements')}>
        <EtatVide titre={t('mouvementsSection.aucunMouvementSurCettePeriode')} description={t('mouvementsSection.importeUnReleveBancaireDepuis')} />
      </Card>
    )
  }

  return (
    <Card title={t('mouvementsSection.mouvements')} headerActions={filtres}>
      {mouvements.length === 0 ? (
        <EtatVide titre={t('mouvementsSection.aucunMouvementNeCorrespondA')} />
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-bordure text-left text-xs font-medium uppercase text-texte-attenue">
                <th className="py-2 pr-4">{t('mouvementsSection.date')}</th>
                <th className="py-2 pr-4">{t('mouvementsSection.libelle')}</th>
                <th className="py-2 pr-4 text-right">{t('mouvementsSection.montant')}</th>
                <th className="py-2 pr-4">{t('mouvementsSection.categorie')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bordure">
              {mouvements.map((m) => {
                const exclu = categorieExclue(m.categorie_id, categories)
                return (
                <tr key={m.id} className={exclu ? 'opacity-60' : undefined}>
                  <td className="py-2 pr-4 text-texte-attenue">{formatDate(m.date)}</td>
                  <td className="py-2 pr-4 text-texte">
                    {m.libelle}
                    {exclu && (
                      <span className="ml-2 whitespace-nowrap rounded-chip bg-chip px-2 py-0.5 text-[11px] text-ink3">
                        {t('mouvementsSection.exclu')}
                      </span>
                    )}
                  </td>
                  <td className={`py-2 pr-4 text-right font-medium ${m.montant >= 0 ? 'text-positif' : 'text-texte'}`}>
                    {formatEuro(m.montant, 2, montantsMasques)}
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      value={m.categorie_id ?? ''}
                      onChange={(e) => api.categoriserMouvement(m.id, e.target.value ? Number(e.target.value) : null).then(onCategorized)}
                      className="rounded-control border border-bordure bg-surface px-2 py-1 text-xs text-texte"
                    >
                      <option value="">{t('mouvementsSection.nonCategorise')}</option>
                      {categoriesTriees.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parent_id !== null ? '↳ ' : ''}
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
