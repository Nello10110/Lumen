import { useId } from 'react'
import type { Detenteur } from '../api/types'
import { formatEuro } from '../utils/format'
import { partsMembres } from '../utils/apercuImmobilier'
import {
  borner,
  correctifProposable,
  ecartAvecCent,
  formaterPart,
  formaterPourcentage,
  nombreSaisi,
  partsEgales,
  repartitionEnCours,
  toutPour,
  totalRepartition,
  totalValide,
  type Repartition,
} from '../utils/repartitionMembres'
import { IconCoche, IconMoins, IconPlus } from './icons'
import { Pill } from './Controls'
import { Input } from './Field'
import { t } from '../i18n'

/** Répartition d'un bien, d'un compte ou d'un prêt entre les membres du foyer (§ BN.1, lot 2).
 *
 * Un seul composant pour les trois éditeurs et pour le formulaire d'ajout d'un bien. Il est
 * CONTRÔLÉ : l'état (`valeurs`) est chez l'appelant, qui sait quand l'enregistrer, le
 * pré-remplir ou le comparer à ce qui est en base.
 *
 * Ce qu'il apporte à la saisie :
 * - par membre, un champ numérique, un curseur et deux boutons − / + (la saisie au clavier, au
 *   doigt ou à la souris) ;
 * - le total TOUJOURS visible, et un correctif en un clic quand il n'est pas de 100 % : on dit
 *   à l'utilisateur ce qui manque ou dépasse, et on lui propose où le mettre ;
 * - deux raccourcis, « À parts égales » et « 100 % <membre> » ;
 * - quand la valeur du bien est connue, la part de chacun, nette de la dette (le prêt suit la
 *   même répartition que le bien). */
export default function RepartitionMembres({
  membres,
  valeurs,
  onChange,
  valeurBien = null,
  detteBien = 0,
  suitPret = false,
  idBase,
}: {
  membres: Detenteur[]
  valeurs: Repartition
  onChange: (valeurs: Repartition) => void
  /** Valeur du bien : active l'affichage des parts détenues et nettes. */
  valeurBien?: number | null
  /** Capital restant dû des prêts du bien, déduit des parts nettes. */
  detteBien?: number
  /** Affiche « Le prêt suit la même répartition ». */
  suitPret?: boolean
  idBase?: string
}) {
  const idAuto = useId()
  const base = idBase ?? idAuto
  const ids = membres.map((m) => m.id)
  const total = totalRepartition(valeurs, ids)
  const enCours = repartitionEnCours(valeurs, ids)
  const valide = totalValide(valeurs, ids)
  const ecart = ecartAvecCent(valeurs, ids)
  const correctif = correctifProposable(valeurs, ids)
  const nomDe = (id: number) => membres.find((m) => m.id === id)?.nom ?? ''

  const parts =
    valeurBien !== null
      ? partsMembres(
          valeurBien,
          detteBien,
          membres.map((m) => ({ detenteurId: m.id, quotitePct: Math.max(0, nombreSaisi(valeurs[m.id])) })),
        )
      : null

  function changer(id: number, brut: string) {
    onChange({ ...valeurs, [id]: brut })
  }

  function pas(id: number, delta: number) {
    changer(id, formaterPart(borner(nombreSaisi(valeurs[id]) + delta)))
  }

  return (
    <div className="space-y-3">
      {membres.length > 1 && (
        <fieldset className="flex min-w-0 flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">{t('repartitionMembres.raccourcis')}</legend>
          <Pill onClick={() => onChange(partsEgales(ids))}>{t('repartitionMembres.partsEgales')}</Pill>
          {membres.map((m) => (
            <Pill key={m.id} onClick={() => onChange(toutPour(m.id, ids))}>
              {t('repartitionMembres.toutPour', { nom: m.nom })}
            </Pill>
          ))}
        </fieldset>
      )}

      <ul className="list-none space-y-2.5 p-0">
        {membres.map((m) => {
          const valeur = valeurs[m.id] ?? ''
          const part = parts?.[m.id]
          const idChamp = `${base}-${m.id}`
          return (
            <li key={m.id} className="rounded-card border border-hairline bg-field p-3">
              {/* Le nom passe avant tout : dans une carte étroite (prêt, compte sur mobile), le pas −/+ et le
                  champ glissent sous le nom au lieu de l'écraser en « A ». */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex min-w-[9rem] flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-chip bg-accent-soft text-[13px] font-semibold text-accent"
                  >
                    {m.nom.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink" title={m.nom}>
                    {m.nom}
                  </span>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => pas(m.id, -1)}
                    aria-label={t('repartitionMembres.moins', { nom: m.nom })}
                    className="flex h-11 w-11 items-center justify-center rounded-control border border-hairline bg-chip text-ink2 transition-colors hover:bg-hover md:h-9 md:w-9"
                  >
                    <IconMoins className="h-4 w-4" />
                  </button>
                  <Input
                    id={idChamp}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="any"
                    value={valeur}
                    onChange={(e) => changer(m.id, e.target.value)}
                    aria-label={t('repartitionMembres.partDe', { nom: m.nom })}
                    className="w-[4.5rem]! px-2! text-right md:py-2!"
                  />
                  <span aria-hidden="true" className="w-4 text-sm text-ink3">
                    %
                  </span>
                  <button
                    type="button"
                    onClick={() => pas(m.id, 1)}
                    aria-label={t('repartitionMembres.plus', { nom: m.nom })}
                    className="flex h-11 w-11 items-center justify-center rounded-control border border-hairline bg-chip text-ink2 transition-colors hover:bg-hover md:h-9 md:w-9"
                  >
                    <IconPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-1 flex min-h-11 items-center md:min-h-9">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={borner(nombreSaisi(valeur))}
                  onChange={(e) => changer(m.id, e.target.value)}
                  aria-label={t('repartitionMembres.curseurDe', { nom: m.nom })}
                  className="h-2 w-full cursor-pointer accent-[var(--accent)]"
                />
              </div>
              {part && valeurBien !== null && (
                <p className="mt-0.5 mb-0 text-xs text-ink3">
                  {/* Les deux notions se confondent tant qu'on n'a pas de prêt : l'infobulle dit ce qui les
                      distingue (recette du 02/09/2026, conservée de l'ancienne carte « Détenteurs »). */}
                  <span title={t('repartitionMembres.aidePartDetenue')}>
                    {t('repartitionMembres.partDetenue')} {formatEuro(part.part_detenue, 0)}
                  </span>
                  {detteBien > 0 && (
                    <>
                      {' · '}
                      <span className="font-semibold text-ink2" title={t('repartitionMembres.aidePartNette')}>
                        {t('repartitionMembres.partNette')} {formatEuro(part.part_nette, 0)}
                      </span>
                    </>
                  )}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <div role="status" aria-live="polite" className="space-y-2">
        {enCours ? (
          <p
            className={`flex items-center gap-1.5 text-sm font-semibold ${valide ? 'text-pos' : 'text-warn'}`}
            data-testid="total-repartition"
          >
            {t('repartitionMembres.total', { total: formaterPourcentage(Math.round(total * 100) / 100) })}
            {valide && (
              <>
                <IconCoche className="h-4 w-4" />
                <span className="sr-only">{t('repartitionMembres.complet')}</span>
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-ink3">{t('repartitionMembres.aucunePart')}</p>
        )}

        {enCours && !valide && correctif && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control bg-warn-bg px-3 py-2 text-sm text-warn">
            <span className="min-w-0 flex-1">
              {ecart > 0
                ? t('repartitionMembres.manque', { ecart: formaterPourcentage(ecart), nom: nomDe(correctif.id) })
                : t('repartitionMembres.trop', { ecart: formaterPourcentage(-ecart), nom: nomDe(correctif.id) })}
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...valeurs, [correctif.id]: correctif.apres })}
              className="inline-flex min-h-11 items-center rounded-control border border-current px-3 text-sm font-semibold md:min-h-9"
            >
              {ecart > 0
                ? t('repartitionMembres.ajouterA', { nom: nomDe(correctif.id) })
                : t('repartitionMembres.retirerA', { nom: nomDe(correctif.id) })}
            </button>
          </div>
        )}
        {enCours && !valide && !correctif && (
          <p className="text-sm text-warn">
            {ecart > 0
              ? t('repartitionMembres.manqueSimple', { ecart: formaterPourcentage(ecart) })
              : t('repartitionMembres.tropSimple', { ecart: formaterPourcentage(-ecart) })}
          </p>
        )}
      </div>

      {suitPret && <p className="text-xs text-ink3">{t('repartitionMembres.suitPret')}</p>}
    </div>
  )
}
