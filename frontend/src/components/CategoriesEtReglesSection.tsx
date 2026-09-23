import { useState } from 'react'
import { api } from '../api/client'
import type { CategorieBudget, RegleCategorisation } from '../api/types'
import { PrimaryButton, SecondaryButton } from './Controls'
import { Field, Input, Select } from './Field'
import { IconChevron } from './icons'
import { t } from '../i18n'

export default function CategoriesEtReglesSection({
  categories,
  regles,
  onChanged,
}: {
  categories: CategorieBudget[]
  regles: RegleCategorisation[]
  onChanged: () => void
}) {
  const [nouvelleCategorie, setNouvelleCategorie] = useState('')
  const [motif, setMotif] = useState('')
  const [categorieRegle, setCategorieRegle] = useState<number | ''>('')
  const [reapplicationEnCours, setReapplicationEnCours] = useState(false)
  const [messageReapplication, setMessageReapplication] = useState<string | null>(null)

  const categoriesRacines = categories.filter((c) => c.parent_id === null)

  async function ajouterCategorie() {
    if (!nouvelleCategorie.trim()) return
    await api.createCategorieBudget(nouvelleCategorie.trim())
    setNouvelleCategorie('')
    onChanged()
  }

  async function supprimerCategorie(id: number) {
    await api.deleteCategorieBudget(id)
    onChanged()
  }

  async function ajouterRegle() {
    if (!motif.trim() || categorieRegle === '') return
    await api.createRegleCategorisation(motif.trim(), categorieRegle)
    setMotif('')
    setCategorieRegle('')
    onChanged()
  }

  async function supprimerRegle(id: number) {
    await api.deleteRegleCategorisation(id)
    onChanged()
  }

  async function reappliquer() {
    setReapplicationEnCours(true)
    setMessageReapplication(null)
    try {
      const res = await api.reappliquerReglesCategorisation()
      setMessageReapplication(t('categoriesEtReglesSection.mouvementsRecategorises', { n: res.mouvements_modifies }))
      onChanged()
    } finally {
      setReapplicationEnCours(false)
    }
  }

  return (
    // `<details>`/`<summary>` conservés pour le repli natif (clavier, lecteur
    // d'écran) — `PanelHeader` suppose un `GlassPanel` non repliable, sa structure
    // ne se prête pas à cet usage. Seule sa MATIÈRE est reprise ici : verre plutôt
    // que `bg-surface` opaque, titre en 15 px/600 encre pleine plutôt qu'en petites
    // capitales grises (geste 5 — même défaut que `Disclosure`, supprimé entre
    // temps faute d'appelant restant).
    <details open className="group rounded-panel border border-stroke bg-panel shadow-glass backdrop-blur-glass backdrop-saturate-[1.8]">
      <summary className="flex cursor-pointer items-center justify-between gap-2 border-b border-hairline px-5 py-3.5 text-[15px] font-semibold -tracking-[0.01em] text-ink [&::-webkit-details-marker]:hidden">{t('categoriesEtReglesSection.categoriesEtReglesDeCategorisation')}<IconChevron className="h-4 w-4 shrink-0 rotate-180 text-ink3 transition-transform group-open:-rotate-90" aria-hidden />
      </summary>
      <div className="space-y-6 p-5">
        <div>
          <h4 className="mb-2 text-sm font-medium text-ink">{t('categoriesEtReglesSection.categories')}</h4>
          <ul className="mb-3 flex flex-wrap gap-2">
            {categoriesRacines.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 rounded-chip bg-chip px-3 py-1 text-sm text-ink2">
                {c.nom}
                <button onClick={() => supprimerCategorie(c.id)} aria-label={`Supprimer ${c.nom}`} className="text-ink4 hover:text-neg">{t('categoriesEtReglesSection.texte')}</button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t('categoriesEtReglesSection.nouvelleCategorie')} className="w-48">
              <Input value={nouvelleCategorie} onChange={(e) => setNouvelleCategorie(e.target.value)} placeholder={t('categoriesEtReglesSection.nouvelleCategorie')} />
            </Field>
            <PrimaryButton onClick={ajouterCategorie}>{t('categoriesEtReglesSection.ajouter')}</PrimaryButton>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-ink">{t('categoriesEtReglesSection.reglesDeCategorisationAutomatique')}<span className="ml-1 font-normal normal-case text-ink3">{t('categoriesEtReglesSection.leLibelleContientLeMotif')}</span>
          </h4>
          {regles.length > 0 && (
            <ul className="mb-3 space-y-1">
              {regles.map((r) => {
                const cat = categories.find((c) => c.id === r.categorie_id)
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 text-sm text-ink">
                    <span>
                      « {r.motif} » → {cat?.nom ?? '?'}
                    </span>
                    <button onClick={() => supprimerRegle(r.id)} className="inline-flex min-h-11 items-center text-xs text-ink3 hover:text-neg md:min-h-0">{t('categoriesEtReglesSection.supprimer')}</button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t('categoriesEtReglesSection.motif')} className="w-40">
              <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={t('categoriesEtReglesSection.motifExSncf')} />
            </Field>
            <Field label={t('categoriesEtReglesSection.categorie')} className="w-44">
              <Select value={categorieRegle} onChange={(e) => setCategorieRegle(e.target.value ? Number(e.target.value) : '')}>
                <option value="">{t('categoriesEtReglesSection.categorie2')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id !== null ? '↳ ' : ''}
                    {c.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <PrimaryButton onClick={ajouterRegle}>{t('categoriesEtReglesSection.ajouterLaRegle')}</PrimaryButton>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <SecondaryButton onClick={reappliquer} disabled={reapplicationEnCours}>
              {reapplicationEnCours ? t('categoriesEtReglesSection.reapplicationEnCours') : t('categoriesEtReglesSection.reappliquerLesReglesEnMasse')}
            </SecondaryButton>
            {messageReapplication && <span className="text-sm text-ink3">{messageReapplication}</span>}
          </div>
        </div>
      </div>
    </details>
  )
}
