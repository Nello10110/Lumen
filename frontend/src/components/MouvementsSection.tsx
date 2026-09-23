import { useState } from 'react'
import { api } from '../api/client'
import type { CategorieBudget, MouvementBancaire } from '../api/types'
import Card from './Card'
import EtatVide from './EtatVide'
import { usePreferencesAffichage } from '../hooks/usePreferencesAffichage'
import { formatDate, formatEuro } from '../utils/format'
import { t } from '../i18n'

/** Filtres catégorie/compte (backlog 2.N.2) — appliqués côté client sur la liste
 * déjà chargée pour la période : le volume d'un budget personnel reste modeste, et
 * ça évite un aller-retour réseau supplémentaire à chaque changement de filtre
 * (même logique que le filtrage par catégorie de `PortefeuillePage`). */
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
  const [filtreCompte, setFiltreCompte] = useState('TOUS')

  const comptesDisponibles = Array.from(new Set(mouvementsPeriode.map((m) => m.compte).filter((c): c is string => Boolean(c)))).sort(
    (a, b) => a.localeCompare(b, 'fr'),
  )

  const mouvements = mouvementsPeriode.filter((m) => {
    if (filtreCategorieId === 'NON_CATEGORISE' && m.categorie_id !== null) return false
    if (typeof filtreCategorieId === 'number' && m.categorie_id !== filtreCategorieId) return false
    if (filtreCompte !== 'TOUS' && m.compte !== filtreCompte) return false
    return true
  })

  const filtres = (
    <div className="flex flex-wrap gap-2">
      <select
        value={filtreCategorieId}
        onChange={(e) => setFiltreCategorieId(e.target.value === 'TOUTES' || e.target.value === 'NON_CATEGORISE' ? e.target.value : Number(e.target.value))}
        className="rounded-control border border-bordure bg-surface px-2 py-1 text-xs text-texte"
      >
        <option value="TOUTES">{t('mouvementsSection.toutesCategories')}</option>
        <option value="NON_CATEGORISE">{t('mouvementsSection.nonCategorise')}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.parent_id !== null ? '↳ ' : ''}
            {c.nom}
          </option>
        ))}
      </select>
      {comptesDisponibles.length > 0 && (
        <select
          value={filtreCompte}
          onChange={(e) => setFiltreCompte(e.target.value)}
          className="rounded-control border border-bordure bg-surface px-2 py-1 text-xs text-texte"
        >
          <option value="TOUS">{t('mouvementsSection.tousLesComptes')}</option>
          {comptesDisponibles.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}
    </div>
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
              {mouvements.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-4 text-texte-attenue">{formatDate(m.date)}</td>
                  <td className="py-2 pr-4 text-texte">{m.libelle}</td>
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
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.parent_id !== null ? '↳ ' : ''}
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
