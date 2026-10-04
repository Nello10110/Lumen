import type { ReactNode } from 'react'
import type { UsageBien } from '../../api/types'
import type { ApercuBien as ApercuBienDonnees } from '../../hooks/useApercuBien'
import { formatEuro, formatPourcent } from '../../utils/format'
import { t } from '../../i18n'

function Ligne({ libelle, valeur, note, ton = 'neutre' }: { libelle: string; valeur: ReactNode; note?: string; ton?: 'neutre' | 'positif' | 'negatif' }) {
  const encre = ton === 'positif' ? 'text-pos' : ton === 'negatif' ? 'text-neg' : 'text-ink'
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="min-w-0 text-[13px] text-ink2">{libelle}</dt>
        <dd className={`shrink-0 text-right text-[15px] font-semibold tabular-nums ${encre}`}>{valeur}</dd>
      </div>
      {note && <p className="mt-0.5 mb-0 text-xs text-ink3">{note}</p>}
    </div>
  )
}

/** Aperçu EN DIRECT d'un bien (§ BN.1, lot 2) — ce que le formulaire vaut déjà, avant tout
 * enregistrement. Il lit les chiffres que `useApercuBien` calcule (mêmes formules que le
 * serveur) et ne garde que ceux qui ont un sens pour le type de bien : le cashflow et les
 * rentabilités n'existent pas sans loyer.
 *
 * Un chiffre qu'on ne peut pas encore calculer n'est pas affiché à zéro — il est absent, et un
 * message dit ce qui manque : un « 0 € » faux est pire qu'un blanc. */
export default function ApercuBien({ apercu, usage, titre = true }: { apercu: ApercuBienDonnees; usage: UsageBien; titre?: boolean }) {
  const { indicateurs: i, valeur } = apercu

  if (valeur === null) {
    return (
      <div>
        {titre && <h3 className="mb-2 text-[15px] font-semibold text-ink">{t('bienImmobilier.apercu.titre')}</h3>}
        <p className="text-sm text-ink3">{t('bienImmobilier.apercu.vide')}</p>
      </div>
    )
  }

  const aDesParts = apercu.parts.length > 0
  return (
    <div>
      {titre && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold text-ink">{t('bienImmobilier.apercu.titre')}</h3>
          <span className="text-xs text-ink3">{t('bienImmobilier.apercu.enDirect')}</span>
        </div>
      )}
      <dl className="divide-y divide-hairline">
        <Ligne libelle={t('bienImmobilier.apercu.valeur')} valeur={formatEuro(valeur, 0)} />
        {i.prix_acquisition_total !== null && (
          <Ligne
            libelle={t('bienImmobilier.apercu.coutTotal')}
            valeur={formatEuro(i.prix_acquisition_total, 0)}
            note={t('bienImmobilier.apercu.coutTotalNote')}
          />
        )}
        {usage === 'locatif' && i.cashflow_mensuel !== null && (
          <Ligne
            libelle={t('bienImmobilier.apercu.cashflow')}
            valeur={`${i.cashflow_mensuel > 0 ? '+' : ''}${formatEuro(i.cashflow_mensuel, 0)}`}
            ton={i.cashflow_mensuel >= 0 ? 'positif' : 'negatif'}
            note={t('bienImmobilier.apercu.cashflowNote')}
          />
        )}
        {usage === 'locatif' && i.rentabilite_brute_pct !== null && i.rentabilite_nette_pct !== null && (
          <Ligne
            libelle={t('bienImmobilier.apercu.rentabilite')}
            valeur={t('bienImmobilier.apercu.rentabiliteValeur', { brute: formatPourcent(i.rentabilite_brute_pct), nette: formatPourcent(i.rentabilite_nette_pct) })}
            note={t('bienImmobilier.apercu.rentabiliteNote')}
          />
        )}
        {i.prix_m2 !== null && <Ligne libelle={t('bienImmobilier.apercu.prixM2')} valeur={formatEuro(i.prix_m2, 0)} />}
        {apercu.aUnPret && apercu.mensualite !== null && (
          <Ligne libelle={t('bienImmobilier.apercu.mensualite')} valeur={`${formatEuro(apercu.mensualite, 0)}${t('bienImmobilier.apercu.parMois')}`} />
        )}
        {apercu.aUnPret && apercu.capitalRestantDu > 0 && (
          <Ligne libelle={t('bienImmobilier.apercu.capitalRestant')} valeur={formatEuro(apercu.capitalRestantDu, 0)} />
        )}
      </dl>
      {aDesParts && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.02em] text-ink3">
            {apercu.aUnPret ? t('bienImmobilier.apercu.partsNettes') : t('bienImmobilier.apercu.parts')}
          </p>
          <dl className="divide-y divide-hairline">
            {apercu.parts.map(({ membre, part }) => (
              <Ligne key={membre.id} libelle={membre.nom} valeur={formatEuro(apercu.aUnPret ? part.part_nette : part.part_detenue, 0)} />
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

/** Une ligne pour la barre du bas sur mobile : l'essentiel de l'aperçu, toujours sous les yeux
 * pendant que l'on remplit les sections. */
export function ResumeApercu({ apercu, usage }: { apercu: ApercuBienDonnees; usage: UsageBien }) {
  if (apercu.valeur === null) return <span className="text-ink3">{t('bienImmobilier.apercu.videCourt')}</span>
  const cashflow = usage === 'locatif' ? apercu.indicateurs.cashflow_mensuel : null
  return (
    <span className="text-ink2">
      {t('bienImmobilier.apercu.valeur')} <strong className="font-semibold text-ink">{formatEuro(apercu.valeur, 0)}</strong>
      {cashflow !== null && (
        <>
          {' · '}
          {t('bienImmobilier.apercu.cashflowCourt')}{' '}
          <strong className={`font-semibold ${cashflow >= 0 ? 'text-pos' : 'text-neg'}`}>
            {cashflow > 0 ? '+' : ''}
            {formatEuro(cashflow, 0)}
            {t('bienImmobilier.apercu.parMois')}
          </strong>
        </>
      )}
    </span>
  )
}
