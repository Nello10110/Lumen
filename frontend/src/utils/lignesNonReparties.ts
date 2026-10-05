import type { LignesNonReparties } from '../api/types'
import { t } from '../i18n'

/** Texte « 12 actifs et 2 prêts » (un seul des deux quand l'autre est à zéro). */
export function resumeLignes({ actifs, prets }: LignesNonReparties): string {
  const morceaux = [
    actifs > 0 ? t('repartitionGlobale.modale.actifs', { n: actifs }) : null,
    prets > 0 ? t('repartitionGlobale.modale.prets', { n: prets }) : null,
  ].filter((m): m is string => m !== null)
  return morceaux.join(` ${t('repartitionGlobale.modale.et')} `)
}
