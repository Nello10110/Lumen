import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ApercuFusionCategorie, CategorieBudget } from '../api/types'
import { Field, Select } from './Field'
import Modale from './Modale'
import { t } from '../i18n'
import { categoriesEnArbre } from '../utils/categoriesBudget'

/** Fusion de `source` dans une autre catégorie (§ BM.4). Le serveur refuse une fusion dans
 * elle-même ou dans l'une de ses sous-catégories, et une catégorie qui a des sous-catégories dans
 * une sous-catégorie (l'arbre n'a que deux niveaux) : la liste ne propose que des cibles valides. */
export default function FusionCategorieModale({
  source,
  categories,
  onClose,
  onFusionnee,
}: {
  source: CategorieBudget
  categories: CategorieBudget[]
  onClose: () => void
  onFusionnee: () => void
}) {
  const [cibleId, setCibleId] = useState<number | ''>('')
  const [apercu, setApercu] = useState<ApercuFusionCategorie | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const aDesSousCategories = categories.some((c) => c.parent_id === source.id)
  const cibles = categoriesEnArbre(categories).filter(
    (c) => c.id !== source.id && c.parent_id !== source.id && !(aDesSousCategories && c.parent_id !== null),
  )
  const cible = cibles.find((c) => c.id === cibleId) ?? null

  // Ce que la fusion déplacerait, demandé au serveur dès qu'une cible est choisie ; une réponse
  // arrivée après un nouveau choix est ignorée.
  useEffect(() => {
    setApercu(null)
    setErreur(null)
    if (cibleId === '') return
    let annule = false
    api
      .apercuFusionCategorieBudget(source.id, cibleId)
      .then((a) => {
        if (!annule) setApercu(a)
      })
      .catch((err) => {
        if (!annule) setErreur((err as Error).message)
      })
    return () => {
      annule = true
    }
  }, [source.id, cibleId])

  async function fusionner() {
    if (cibleId === '') return
    setEnCours(true)
    setErreur(null)
    try {
      await api.fusionnerCategorieBudget(source.id, cibleId)
      onFusionnee()
    } catch (err) {
      setErreur((err as Error).message)
      setEnCours(false)
    }
  }

  const noms = { nom: source.nom, cible: cible?.nom ?? '' }

  return (
    <Modale onClose={onClose} panelClassName="w-full max-w-md rounded-panel border border-stroke bg-panel-hi shadow-glass-lg backdrop-blur-glass p-6">
      {({ titleId }) => (
        <>
          <h2 id={titleId} className="text-lg font-semibold text-texte">
            {t('categoriesEtReglesSection.fusionTitre', { nom: source.nom })}
          </h2>
          <div className="mt-3">
            <Field label={t('categoriesEtReglesSection.fusionCible', { nom: source.nom })}>
              <Select value={cibleId} onChange={(e) => setCibleId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">{t('categoriesEtReglesSection.fusionChoisir')}</option>
                {cibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id !== null ? '↳ ' : ''}
                    {c.nom}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {cible && !apercu && !erreur && <p className="mt-3 text-sm text-texte-attenue">{t('categoriesEtReglesSection.fusionCalcul')}</p>}
          {cible && apercu && (
            <div className="mt-3 space-y-1.5 text-sm text-texte">
              <p>{t('categoriesEtReglesSection.fusionAlias', noms)}</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>{t('categoriesEtReglesSection.fusionMouvements', { n: apercu.mouvements, cible: noms.cible })}</li>
                <li>{t('categoriesEtReglesSection.fusionRegles', { n: apercu.regles, cible: noms.cible })}</li>
                {apercu.sous_categories_deplacees > 0 && (
                  <li>{t('categoriesEtReglesSection.fusionSousCategoriesDeplacees', { n: apercu.sous_categories_deplacees, cible: noms.cible })}</li>
                )}
                {apercu.sous_categories_fusionnees > 0 && (
                  <li>{t('categoriesEtReglesSection.fusionSousCategoriesFusionnees', { n: apercu.sous_categories_fusionnees, cible: noms.cible })}</li>
                )}
                {apercu.budget_transfere && <li>{t('categoriesEtReglesSection.fusionBudgetTransfere', noms)}</li>}
                {apercu.budget_abandonne && <li>{t('categoriesEtReglesSection.fusionBudgetAbandonne', noms)}</li>}
                {apercu.exclusion_differente && <li>{t('categoriesEtReglesSection.fusionExclusionDifferente', noms)}</li>}
              </ul>
              <p className="font-medium">{t('categoriesEtReglesSection.fusionDefinitive')}</p>
            </div>
          )}
          {erreur && (
            <p role="alert" className="mt-3 text-sm text-negatif">
              {erreur}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={enCours}
              className="rounded-control px-4 py-2 text-sm font-medium text-texte-attenue hover:bg-surface-elevee disabled:opacity-40"
            >
              {t('categoriesEtReglesSection.annuler')}
            </button>
            <button
              type="button"
              onClick={fusionner}
              disabled={!apercu || enCours}
              className="rounded-control bg-negatif px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {enCours ? t('categoriesEtReglesSection.fusionEnCours') : t('categoriesEtReglesSection.fusionConfirmer')}
            </button>
          </div>
        </>
      )}
    </Modale>
  )
}
